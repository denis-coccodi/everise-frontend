import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { DataCentre, PartyFinderBoard } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { fromEvent, interval, pipe, switchMap, tap } from 'rxjs';
import { PartyFinderFilters, categoriesIn, matchesFilters } from './listing-filters';
import { SortOrder, sortListings } from './listing-sort';
import { loadPreferences, savePreferences } from './party-finder-preferences';
import { PartyFinderService } from './party-finder.service';

// The page asks again this often while it's in view (the backend reads
// xivpf at most once a minute, so a minute old at worst).
export const POLL_MS = 30 * 1000;
// The time shown ("12 min left") moves on this often.
const TICK_MS = 15 * 1000;
// Listings a page: an even number, for two a row.
export const PAGE_SIZE = 20;

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
  // Every data centre by region, from the last answer (kept while another
  // data centre loads).
  regions: PartyFinderBoard['regions'];
  filters: PartyFinderFilters;
  sort: SortOrder;
  // The page of listings shown, from 1; kept through refreshes.
  page: number;
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
    regions: [],
    sort: preferences.sort,
    page: 1,
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
    // The listings that match, in the order picked.
    const listings = computed(() =>
      sortListings(
        live().filter((listing) => matchesFilters(listing, store.filters())),
        store.sort(),
      ),
    );
    const pages = computed(() =>
      Array.from({ length: Math.max(1, Math.ceil(listings().length / PAGE_SIZE)) }, (_, i) => i + 1),
    );
    // The page picked, or the last one when a refresh left fewer.
    const currentPage = computed(() => Math.min(store.page(), pages().length));
    return {
      worlds: computed(() => store.board()?.worlds ?? []),
      // The game's role icons and the beginners' sprout, once loaded.
      // The same icons from one refresh to the next don't redraw the list.
      icons: computed(() => store.board()?.icons ?? null, {
        equal: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      }),
      categories: computed(() => categoriesIn(live())),
      listings,
      total: computed(() => live().length),
      // The data centres for the list: by region, or just this one before
      // the first answer.
      regions: computed(() =>
        store.regions().length ? store.regions() : [{ name: '', dataCentres: [store.dataCentre()] }],
      ),
      pages,
      currentPage,
      pageListings: computed(() => listings().slice((currentPage() - 1) * PAGE_SIZE, currentPage() * PAGE_SIZE)),
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
                patchState(store, {
                  board,
                  regions: board.regions,
                  loadState: 'ready',
                  loading: false,
                  error: '',
                  checkedAt: Date.now(),
                }),
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
        sort: store.sort(),
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
          page: 1,
        }));
        remember();
        load();
      },
      setFilters(changes: Partial<PartyFinderFilters>) {
        patchState(store, ({ filters }) => ({ filters: { ...filters, ...changes }, page: 1 }));
        if ('world' in changes) remember();
      },
      setSort(sort: SortOrder) {
        patchState(store, { sort, page: 1 });
        remember();
      },
      setPage: (page: number) => patchState(store, { page }),
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
