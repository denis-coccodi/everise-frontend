import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { DataCentre, PartyFinderBoard } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { fromEvent, interval, pipe, switchMap, tap } from 'rxjs';
import { PartyFinderFilters, categoriesIn, matchesFilters } from './listing-filters';
import { loadPreferences, savePreferences } from './party-finder-preferences';
import { PartyFinderService } from './party-finder.service';

// The page asks again this often while it's in view (the backend reads
// xivpf at most once a minute, so a minute old at worst).
export const POLL_MS = 30 * 1000;
// The time shown ("12 min left") moves on this often.
const TICK_MS = 15 * 1000;

interface PartyFinderState {
  board: PartyFinderBoard | null;
  loadState: 'loading' | 'ready' | 'error';
  // A load is running (the first, or a refresh).
  loading: boolean;
  // The backend's words when the last load failed.
  error: string;
  // When the page last heard back, and the clock for "time left".
  checkedAt: number;
  now: number;
  dataCentre: DataCentre;
  filters: PartyFinderFilters;
}

function initialState(): PartyFinderState {
  const preferences = loadPreferences();
  return {
    board: null,
    loadState: 'loading',
    loading: false,
    error: '',
    checkedAt: 0,
    now: Date.now(),
    dataCentre: preferences.dataCentre,
    filters: {
      world: preferences.worlds[preferences.dataCentre] ?? null,
      category: '',
      role: '',
      search: '',
      showNoDuty: false,
      beginnersOnly: false,
    },
  };
}

// The Party Finder page's state: a data centre's listings, refreshed while
// the page is in view, and what the member filters them by. Provided by the
// page.
export const PartyFinderStore = signalStore(
  withState<PartyFinderState>(initialState),
  withComputed((store) => {
    // Listings whose time hasn't run out.
    const live = computed(() => (store.board()?.listings ?? []).filter((l) => Date.parse(l.expiresAt) > store.now()));
    return {
      worlds: computed(() => store.board()?.worlds ?? []),
      categories: computed(() => categoriesIn(live())),
      listings: computed(() => live().filter((listing) => matchesFilters(listing, store.filters()))),
      total: computed(() => live().length),
    };
  }),
  withMethods((store, service = inject(PartyFinderService)) => {
    const load = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() =>
          service.board(store.dataCentre()).pipe(
            tapResponse({
              next: (board) =>
                patchState(store, { board, loadState: 'ready', loading: false, error: '', checkedAt: Date.now() }),
              // A failed refresh keeps what's shown, and says why.
              error: (error: unknown) =>
                patchState(store, {
                  loading: false,
                  error: serverMessage(error),
                  loadState: store.board() ? 'ready' : 'error',
                }),
            }),
          ),
        ),
      ),
    );
    const remember = () => {
      const saved = loadPreferences();
      savePreferences({
        dataCentre: store.dataCentre(),
        worlds: { ...saved.worlds, [store.dataCentre()]: store.filters().world },
      });
    };
    return {
      load,
      setDataCentre(dataCentre: DataCentre) {
        if (dataCentre === store.dataCentre()) return;
        const world = loadPreferences().worlds[dataCentre] ?? null;
        patchState(store, ({ filters }) => ({
          dataCentre,
          board: null,
          loadState: 'loading' as const,
          filters: { ...filters, world, category: '' },
        }));
        remember();
        load();
      },
      setFilters(changes: Partial<PartyFinderFilters>) {
        patchState(store, ({ filters }) => ({ filters: { ...filters, ...changes } }));
        if ('world' in changes) remember();
      },
      tick: () => patchState(store, { now: Date.now() }),
      // Asks again if the list is older than a poll, e.g. back from another tab.
      refreshIfStale() {
        if (document.visibilityState === 'visible' && Date.now() - store.checkedAt() >= POLL_MS) load();
      },
    };
  }),
  withHooks((store) => ({
    onInit() {
      store.load();
      rxMethod<number>(tap(() => document.visibilityState === 'visible' && store.load()))(interval(POLL_MS));
      rxMethod<Event>(tap(() => store.refreshIfStale()))(fromEvent(document, 'visibilitychange'));
      rxMethod<number>(tap(() => store.tick()))(interval(TICK_MS));
    },
  })),
);
