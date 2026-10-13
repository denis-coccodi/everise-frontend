import { computed, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { MarketHistory, MarketItem, MarketScopes } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { EMPTY, debounceTime, distinctUntilChanged, pipe, switchMap, tap, timer } from 'rxjs';
import { MAX_ITEMS, MarketSelection, selectionFromQuery, selectionToQuery } from './market-query';
import { historyStart, priceSeries, shownRange, today } from './market-series';
import { MarketService } from './market.service';

// While an item's older days are still being read, the page asks again
// this often.
export const MARKET_POLL_MS = 4000;
// The search waits this long after the last key.
export const SEARCH_DELAY_MS = 300;

interface MarketState extends MarketSelection {
  // The picked items' names and icons.
  known: MarketItem[];
  history: MarketHistory | null;
  loadState: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  regions: MarketScopes['regions'];
  // The item search: what was typed and what it found.
  searchText: string;
  results: MarketItem[];
  searchState: 'idle' | 'searching' | 'done' | 'error';
  searchError: string;
}

function initialState(): MarketState {
  const query = inject(ActivatedRoute, { optional: true })?.snapshot.queryParamMap;
  return {
    ...selectionFromQuery(query ?? { get: () => null }),
    known: [],
    history: null,
    loadState: 'idle',
    error: '',
    regions: [],
    searchText: '',
    results: [],
    searchState: 'idle',
    searchError: '',
  };
}

// The market page's state: the items compared, where and which sales, read
// again every few seconds while older days are still coming in, and the
// days shown. All of it but the search is kept in the page's query string
// (market-query.ts). Provided by the page.
export const MarketStore = signalStore(
  withState<MarketState>(initialState),
  withComputed((store) => {
    const end = computed(() => today());
    // The history's first day; today before anything is known.
    const start = computed(() => historyStart(store.history()) ?? end());
    const range = computed(() => shownRange({ from: store.from(), to: store.to() }, start(), end()));
    return {
      start,
      end,
      range,
      // The picked items in order, as far as they're known.
      picked: computed(() => store.items().map((id) => store.known().find((item) => item.id === id) ?? null)),
      full: computed(() => store.items().length >= MAX_ITEMS),
      series: computed(() => priceSeries(store.history(), store.known(), range())),
      // Older days are still being read for some item.
      reading: computed(() => !!store.history()?.items.some((item) => !item.complete)),
    };
  }),
  withMethods(
    (
      store,
      service = inject(MarketService),
      router = inject(Router),
      route = inject(ActivatedRoute, { optional: true }),
    ) => {
      const selection = (): MarketSelection => ({
        items: store.items(),
        scope: store.scope(),
        quality: store.quality(),
        from: store.from(),
        to: store.to(),
        scale: store.scale(),
      });
      const loadHistory = rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loadState: store.history() ? 'ready' : 'loading' })),
          switchMap(() => {
            if (!store.items().length) {
              patchState(store, { history: null, loadState: 'idle', error: '' });
              return EMPTY;
            }
            return service.history(store.scope(), store.items(), store.quality()).pipe(
              tapResponse({
                next: (history) => patchState(store, { history, loadState: 'ready', error: '' }),
                error: (error: unknown) =>
                  patchState(store, { loadState: store.history() ? 'ready' : 'error', error: serverMessage(error) }),
              }),
              // Older days still coming in: ask again in a moment.
              switchMap((history) => (history.items.some((item) => !item.complete) ? timer(MARKET_POLL_MS) : EMPTY)),
              tap(() => loadHistory()),
            );
          }),
        ),
      );
      const loadNames = rxMethod<number[]>(
        pipe(
          switchMap((ids) => {
            const missing = ids.filter((id) => !store.known().some((item) => item.id === id));
            if (!missing.length) return EMPTY;
            return service.items(missing).pipe(
              tapResponse({
                next: ({ items }) => patchState(store, { known: [...store.known(), ...items] }),
                error: (error: unknown) => patchState(store, { error: serverMessage(error) }),
              }),
            );
          }),
        ),
      );
      // Shows `next` and writes it to the query string. New items, place or
      // quality are read again; days and scale are only drawn differently.
      function show(next: MarketSelection) {
        const changed =
          next.items.join() !== store.items().join() ||
          next.scope !== store.scope() ||
          next.quality !== store.quality();
        patchState(store, next);
        if (changed) {
          patchState(store, { history: null });
          loadNames(next.items);
          loadHistory();
        }
        if (route) {
          void router.navigate([], {
            relativeTo: route,
            queryParams: selectionToQuery(next),
            queryParamsHandling: 'merge',
            replaceUrl: !changed,
          });
        }
      }
      return {
        // Reads the picked items' names and history.
        load() {
          loadNames(store.items());
          loadHistory();
        },
        loadScopes: rxMethod<void>(
          switchMap(() =>
            service.scopes().pipe(
              tapResponse({
                next: ({ regions }) => patchState(store, { regions }),
                error: () => patchState(store, { regions: [] }),
              }),
            ),
          ),
        ),
        // Items whose name has the text typed (2 letters or more).
        search: rxMethod<string>(
          pipe(
            tap((text) => patchState(store, { searchText: text })),
            debounceTime(SEARCH_DELAY_MS),
            distinctUntilChanged(),
            switchMap((text) => {
              if (text.trim().length < 2) {
                patchState(store, { results: [], searchState: 'idle', searchError: '' });
                return EMPTY;
              }
              patchState(store, { searchState: 'searching' });
              return service.search(text.trim()).pipe(
                tapResponse({
                  next: ({ items }) => patchState(store, { results: items, searchState: 'done', searchError: '' }),
                  error: (error: unknown) =>
                    patchState(store, { results: [], searchState: 'error', searchError: serverMessage(error) }),
                }),
              );
            }),
          ),
        ),
        add(item: MarketItem) {
          if (store.items().includes(item.id) || store.items().length >= MAX_ITEMS) return;
          patchState(store, { known: [...store.known().filter((known) => known.id !== item.id), item] });
          show({ ...selection(), items: [...store.items(), item.id] });
        },
        remove: (id: number) => show({ ...selection(), items: store.items().filter((item) => item !== id) }),
        setScope: (scope: string) => show({ ...selection(), scope }),
        setQuality: (quality: MarketSelection['quality']) => show({ ...selection(), quality }),
        setScale: (scale: MarketSelection['scale']) => show({ ...selection(), scale }),
        // The days shown, kept within the history; null: from its start, or
        // up to today.
        setRange(from: string | null, to: string | null) {
          const range = shownRange({ from, to }, store.start(), store.end());
          show({
            ...selection(),
            from: from === null || range.from === store.start() ? null : range.from,
            to: to === null || range.to === store.end() ? null : range.to,
          });
        },
        // The query string changed (Back, Forward, a link): what it says.
        followQuery: rxMethod<ParamMap>(tap((query) => show(selectionFromQuery(query)))),
      };
    },
  ),
  withHooks((store, route = inject(ActivatedRoute, { optional: true })) => ({
    onInit() {
      store.loadScopes();
      store.load();
      // Its first value is what the store started from: nothing to do.
      if (route) store.followQuery(route.queryParamMap);
    },
  })),
);
