import { computed, inject } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { VenueDataCentre, VenueList } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { interval, map, pipe, switchMap, tap } from 'rxjs';
import { isOpen } from './venue-time';
import { venueDataCentre } from './venues-query';
import { VenuesService } from './venues.service';

// The page asks again this often while it's in view (the backend reads
// FFXIV Venues at most every five minutes).
export const VENUES_POLL_MS = 5 * 60 * 1000;
// "Open now" moves on this often.
const TICK_MS = 60 * 1000;

interface VenuesState {
  list: VenueList | null;
  loadState: 'loading' | 'ready' | 'error';
  // The backend's words when the last load failed.
  error: string;
  // The data centre shown, from the query string (?dc=light).
  dataCentre: VenueDataCentre;
  // The data centres with venues by region, from the last answer (kept
  // while another data centre loads).
  knownRegions: VenueList['regions'];
  now: number;
}

function initialState(): VenuesState {
  const query = inject(ActivatedRoute, { optional: true })?.snapshot.queryParamMap;
  return {
    list: null,
    loadState: 'loading',
    error: '',
    dataCentre: venueDataCentre(query ?? { get: () => null }),
    knownRegions: [],
    now: Date.now(),
  };
}

// The Venues page's state: a data centre's venues opening this week, those
// open now apart from the rest, refreshed while the page is in view.
// Provided by the page.
export const VenuesStore = signalStore(
  withState<VenuesState>(initialState),
  withComputed((store) => {
    // Venues whose opening hasn't ended since the backend read them.
    const venues = computed(() =>
      (store.list()?.venues ?? []).filter((venue) => Date.parse(venue.closesAt) > store.now()),
    );
    return {
      openNow: computed(() => venues().filter((venue) => isOpen(venue, store.now()))),
      later: computed(() => venues().filter((venue) => !isOpen(venue, store.now()))),
      total: computed(() => venues().length),
      // The data centres for the list: by region, or just this one before
      // the first answer.
      regions: computed(() =>
        store.knownRegions().length ? store.knownRegions() : [{ name: '', dataCentres: [store.dataCentre()] }],
      ),
    };
  }),
  withMethods((store, service = inject(VenuesService)) => {
    const load = rxMethod<VenueDataCentre>(
      pipe(
        switchMap((dataCentre) =>
          service.venues(dataCentre).pipe(
            tapResponse({
              next: (list) =>
                patchState(store, {
                  list,
                  knownRegions: list.regions,
                  loadState: 'ready',
                  error: '',
                  now: Date.now(),
                }),
              // A failed refresh keeps what's shown, and says why.
              error: (error: unknown) =>
                patchState(store, {
                  error: serverMessage(error),
                  loadState: store.list() ? 'ready' : 'error',
                }),
            }),
          ),
        ),
      ),
    );
    return {
      refresh: () => load(store.dataCentre()),
      // Asked for again after a failed load: the page shows it loading.
      retry: () => {
        patchState(store, { loadState: store.list() ? 'ready' : 'loading', error: '' });
        load(store.dataCentre());
      },
      // The query string changed (a data centre's link, Back, Forward).
      followQuery: rxMethod<ParamMap>(
        pipe(
          map((query) => venueDataCentre(query)),
          tap((dataCentre) => {
            if (dataCentre === store.dataCentre() && store.list()) return;
            patchState(store, { dataCentre, list: null, loadState: 'loading', error: '' });
            load(dataCentre);
          }),
        ),
      ),
      tick: () => patchState(store, { now: Date.now() }),
      // The data centres with venues, on their own: the list offers them
      // even when the venues don't load. A failure leaves the list's own.
      loadRegions: rxMethod<void>(
        switchMap(() =>
          service.regions().pipe(
            tapResponse({
              next: ({ regions }) => patchState(store, { knownRegions: regions }),
              error: () => undefined,
            }),
          ),
        ),
      ),
    };
  }),
  withHooks((store, route = inject(ActivatedRoute, { optional: true })) => ({
    onInit() {
      store.loadRegions();
      if (route) store.followQuery(route.queryParamMap);
      else store.refresh();
      rxMethod<number>(tap(() => document.visibilityState === 'visible' && store.refresh()))(interval(VENUES_POLL_MS));
      rxMethod<number>(tap(() => store.tick()))(interval(TICK_MS));
    },
  })),
);
