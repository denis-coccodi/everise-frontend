import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { DataCentre, PartyFinderListingPage } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { interval, map, pipe, switchMap, tap } from 'rxjs';
import { dataCentreName } from './party-finder-query';
import { POLL_MS } from './party-finder.store';
import { PartyFinderService } from './party-finder.service';

// The time shown ("12 min left") moves on this often.
const TICK_MS = 15 * 1000;

interface PfListingState {
  // The listing's id, from the address.
  id: string;
  found: PartyFinderListingPage | null;
  // 'gone': the backend says the listing is no longer up (or never was).
  loadState: 'loading' | 'ready' | 'gone' | 'error';
  // Why it's gone, or why the last check failed, in the backend's words.
  error: string;
  now: number;
}

const initialState: PfListingState = { id: '', found: null, loadState: 'loading', error: '', now: Date.now() };

// One Party Finder listing's own page (/party-finder/listings/<id>): the
// listing, checked again every 30 seconds while the page is in view, until
// the backend says it's gone. Provided by the page.
export const PfListingStore = signalStore(
  withState<PfListingState>(initialState),
  withComputed((store) => ({
    // The data centre the listing is on: the id names it ("light-..."), so
    // it's known even once the listing is gone.
    dataCentre: computed((): DataCentre | null => {
      const prefix = /^([a-z]+)-/.exec(store.id())?.[1];
      return store.found()?.dataCentre ?? (prefix ? dataCentreName(prefix) : null);
    }),
  })),
  withMethods((store, service = inject(PartyFinderService)) => ({
    load: rxMethod<string>(
      pipe(
        tap((id) => {
          if (id !== store.id()) patchState(store, { ...initialState, id, now: Date.now() });
        }),
        switchMap((id) =>
          service.listing(id).pipe(
            tapResponse({
              next: (found) => patchState(store, { found, loadState: 'ready', error: '' }),
              error: (error: unknown) => {
                const gone = error instanceof HttpErrorResponse && error.status === 404;
                patchState(store, {
                  error: serverMessage(error),
                  // A failed check keeps what's shown; a 404 ends it.
                  ...(gone ? { found: null, loadState: 'gone' as const } : {}),
                  ...(!gone && !store.found() ? { loadState: 'error' as const } : {}),
                });
              },
            }),
          ),
        ),
      ),
    ),
    tick: () => patchState(store, { now: Date.now() }),
  })),
  withHooks((store, route = inject(ActivatedRoute)) => ({
    onInit() {
      store.load(route.paramMap.pipe(map((params: ParamMap) => params.get('id') ?? '')));
      // Checked again while it's up and the page is in view.
      rxMethod<number>(
        tap(() => {
          if (document.visibilityState === 'visible' && store.loadState() === 'ready') store.load(store.id());
        }),
      )(interval(POLL_MS));
      rxMethod<number>(tap(() => store.tick()))(interval(TICK_MS));
    },
  })),
);
