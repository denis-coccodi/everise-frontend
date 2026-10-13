import { computed, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { DataCentre, PartyFinderBoard } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { fromEvent, interval, pipe, switchMap, tap } from 'rxjs';
import { PartyFinderFilters, categoriesIn, matchesFilters, worldId } from './listing-filters';
import { SortOrder, sortListings } from './listing-sort';
import { PartyFinderSelection, selectionFromQuery, selectionToQuery } from './party-finder-query';
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
  // Every data centre by region, from the last answer (kept while another
  // data centre loads).
  regions: PartyFinderBoard['regions'];
  // What the page shows, a mirror of its query string (party-finder-query.ts).
  dataCentre: DataCentre;
  filters: PartyFinderFilters;
  sort: SortOrder;
  // The page of listings shown, from 1; kept through refreshes.
  page: number;
}

function initialState(): PartyFinderState {
  const query = inject(ActivatedRoute, { optional: true })?.snapshot.queryParamMap;
  return {
    board: null,
    loadState: 'loading',
    loading: false,
    error: '',
    checkedAt: 0,
    now: Date.now(),
    regions: [],
    ...selectionFromQuery(query ?? { get: () => null }),
  };
}

// The Party Finder page's state: a data centre's listings, refreshed while
// the page is in view, and what the member filters them by, kept in the
// page's query string. Provided by the page.
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
      // The data centre's worlds, each with its id in the query string.
      worlds: computed(() => (store.board()?.worlds ?? []).map((world) => ({ id: worldId(world), name: world.name }))),
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
  withMethods(
    (
      store,
      service = inject(PartyFinderService),
      router = inject(Router),
      route = inject(ActivatedRoute, { optional: true }),
    ) => {
      const selection = (): PartyFinderSelection => ({
        dataCentre: store.dataCentre(),
        filters: store.filters(),
        sort: store.sort(),
        page: store.page(),
      });
      // Another data centre: its own worlds and categories, so none picked.
      const onDataCentre = (dataCentre: DataCentre): PartyFinderSelection => ({
        ...selection(),
        dataCentre,
        filters: { ...store.filters(), world: null, category: '' },
        page: 1,
      });
      const load = rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true })),
          switchMap(() =>
            service.board(store.dataCentre()).pipe(
              tapResponse({
                next: (board) => {
                  patchState(store, {
                    board,
                    regions: board.regions,
                    loadState: 'ready',
                    loading: false,
                    error: '',
                    checkedAt: Date.now(),
                  });
                  // A world the data centre doesn't have: all of them.
                  const world = store.filters().world;
                  if (world && !board.worlds.some((w) => worldId(w) === world)) {
                    show({ ...selection(), filters: { ...store.filters(), world: null } });
                  }
                },
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
      // Shows `next` and writes it to the query string: a new history entry
      // for another data centre, the same one for anything else.
      function show(next: PartyFinderSelection, newEntry = false) {
        const otherDataCentre = next.dataCentre !== store.dataCentre();
        patchState(store, { dataCentre: next.dataCentre, filters: next.filters, sort: next.sort, page: next.page });
        if (otherDataCentre) {
          patchState(store, { board: null, loadState: 'loading' });
          load();
        }
        if (route) {
          // The same address again is no navigation at all. A listing
          // shared from another data centre isn't on this one.
          void router.navigate([], {
            relativeTo: route,
            queryParams: { ...selectionToQuery(next), ...(otherDataCentre && { listing: null }) },
            queryParamsHandling: 'merge',
            replaceUrl: !newEntry,
          });
        }
      }
      return {
        load,
        setDataCentre: (dataCentre: DataCentre) => {
          if (dataCentre !== store.dataCentre()) show(onDataCentre(dataCentre), true);
        },
        // The query for a link to another data centre, keeping the rest.
        queryFor: (dataCentre: DataCentre) => selectionToQuery(onDataCentre(dataCentre)),
        setFilters: (changes: Partial<PartyFinderFilters>) =>
          show({ ...selection(), filters: { ...store.filters(), ...changes }, page: 1 }),
        setSort: (sort: SortOrder) => show({ ...selection(), sort, page: 1 }),
        setPage: (page: number) => show({ ...selection(), page }),
        // The query string changed (Back, Forward, a link): what it says.
        followQuery: rxMethod<ParamMap>(tap((query) => show(selectionFromQuery(query)))),
        tick: () => patchState(store, { now: Date.now() }),
        // Asks again if the list is older than a poll, e.g. back from another tab.
        refreshIfStale() {
          if (document.visibilityState === 'visible' && Date.now() - store.checkedAt() >= POLL_MS) load();
        },
      };
    },
  ),
  withHooks((store, route = inject(ActivatedRoute, { optional: true })) => ({
    onInit() {
      store.load();
      if (route) store.followQuery(route.queryParamMap);
      rxMethod<number>(tap(() => document.visibilityState === 'visible' && store.load()))(interval(POLL_MS));
      rxMethod<Event>(tap(() => store.refreshIfStale()))(fromEvent(document, 'visibilitychange'));
      rxMethod<number>(tap(() => store.tick()))(interval(TICK_MS));
    },
  })),
);
