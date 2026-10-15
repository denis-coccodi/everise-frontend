import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { VenueDetail } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { interval, map, pipe, switchMap, tap } from 'rxjs';
import { VenuesService } from './venues.service';

// "Open now" moves on this often.
const TICK_MS = 60 * 1000;

interface VenuePageState {
  // The venue's id, from the address.
  id: string;
  venue: VenueDetail | null;
  // 'missing': the backend says the site doesn't list it.
  loadState: 'loading' | 'ready' | 'missing' | 'error';
  // Why it's missing, or why loading failed, in the backend's words.
  error: string;
  now: number;
}

const initialState: VenuePageState = { id: '', venue: null, loadState: 'loading', error: '', now: Date.now() };

// One venue's own page (/venues/<id>): the venue as the backend last read
// it from FFXIV Venues. Provided by the page.
export const VenuePageStore = signalStore(
  withState<VenuePageState>(initialState),
  withMethods((store, service = inject(VenuesService)) => ({
    load: rxMethod<string>(
      pipe(
        tap((id) => patchState(store, { ...initialState, id, now: Date.now() })),
        switchMap((id) =>
          service.venue(id).pipe(
            tapResponse({
              next: ({ venue }) => patchState(store, { venue, loadState: 'ready', now: Date.now() }),
              error: (error: unknown) => {
                const missing = error instanceof HttpErrorResponse && error.status === 404;
                patchState(store, { error: serverMessage(error), loadState: missing ? 'missing' : 'error' });
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
      rxMethod<number>(tap(() => store.tick()))(interval(TICK_MS));
    },
  })),
);
