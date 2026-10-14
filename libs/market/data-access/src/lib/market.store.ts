import { computed, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { MarketHistory, MarketItem, MarketRegions } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { EMPTY, forkJoin, pipe, retry, switchMap, tap, timer } from 'rxjs';
import { MAX_WORLDS, MarketSelection, selectionFromQuery, selectionToQuery } from './market-query';
import {
  chosenWorlds,
  daysBefore,
  lowest,
  mergeHistory,
  priceSeries,
  readBackTo,
  regionWorlds,
  shownRange,
  today,
  worldDays,
} from './market-series';
import { MarketService } from './market.service';

// While older days are still being read, the page asks again this often,
// for the days it doesn't have yet only.
export const MARKET_POLL_MS = 2000;
// The days shown when none are picked: light on a first look.
export const DEFAULT_DAYS = 30;
// Before the regions are known: the first day of Universalis' history.
const HISTORY_START = '2022-10-01';

interface MarketState extends MarketSelection {
  // The item picked, once known.
  known: MarketItem | null;
  // The region's history, then Oceania's when asked for.
  histories: MarketHistory[];
  loadState: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  regions: MarketRegions | null;
}

function initialState(): MarketState {
  const query = inject(ActivatedRoute, { optional: true })?.snapshot.queryParamMap;
  return {
    ...selectionFromQuery(query ?? { get: () => null }),
    known: null,
    histories: [],
    loadState: 'idle',
    error: '',
    regions: null,
  };
}

// The market history page's state: an item's prices on each world of a
// region (and Oceania's, when asked), read again every few seconds while
// older days are still coming in; the worlds drawn, the lowest prices, and
// the days shown. All of it is kept in the page's query string
// (market-query.ts). Provided by the page.
export const MarketStore = signalStore(
  withState<MarketState>(initialState),
  withComputed((store) => {
    const end = computed(() => today());
    const start = computed(() => store.regions()?.historyStart ?? HISTORY_START);
    const range = computed(() => shownRange({ from: store.from(), to: store.to() }, start(), end(), DEFAULT_DAYS));
    // The regions drawn: the one picked, and Oceania when asked for.
    const shownRegions = computed(() =>
      (store.regions()?.regions ?? []).filter(
        (region) => region.id === store.region() || (store.oceania() && region.id === 'oceania'),
      ),
    );
    const worlds = computed(() => regionWorlds(shownRegions()));
    const days = computed(() => worldDays(store.histories(), worlds(), range()));
    const lowestToday = computed(() => lowest(days().filter((day) => day.day === end())));
    // The worlds drawn: those picked, or the home world and today's cheapest.
    const chosen = computed(() =>
      chosenWorlds(store.worlds(), [store.regions()?.homeWorld.toLowerCase(), lowestToday()?.world.key], worlds()),
    );
    return {
      start,
      end,
      range,
      // The regions read: the one picked, and Oceania when asked for.
      readRegions: computed(() => [
        store.region(),
        ...(store.oceania() && store.region() !== 'oceania' ? ['oceania'] : []),
      ]),
      shownRegions,
      // Every world drawable (`worlds` is the state: those picked, by key).
      allWorlds: worlds,
      chosen,
      lowestToday,
      lowestShown: computed(() => lowest(days())),
      series: computed(() => priceSeries(days(), chosen())),
      reading: computed(() => store.histories().some((history) => !history.complete)),
      readBackTo: computed(() => readBackTo(store.histories())),
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
        item: store.item(),
        region: store.region(),
        oceania: store.oceania(),
        worlds: store.worlds(),
        quality: store.quality(),
        from: store.from(),
        to: store.to(),
        scale: store.scale(),
      });
      // `more`: asking again while older days come in, for those only (up
      // to how far back each region was read on every world).
      const loadHistories = rxMethod<boolean>(
        pipe(
          switchMap((more) => {
            const item = store.item();
            if (item === null) {
              patchState(store, { histories: [], loadState: 'idle', error: '' });
              return EMPTY;
            }
            patchState(store, { loadState: store.histories().length ? 'ready' : 'loading' });
            const shown = more ? store.histories() : [];
            const upTo = store.readRegions().map((_, i) => shown[i]?.readBackTo ?? null);
            return forkJoin(
              store.readRegions().map((region, i) =>
                service
                  .history(region, item, store.quality(), store.range().from, upTo[i])
                  // Universalis fails now and then: try twice more before saying so.
                  .pipe(retry({ count: 2, delay: MARKET_POLL_MS })),
              ),
            ).pipe(
              tapResponse({
                next: (answers) => {
                  const histories = answers.map((answer, i) =>
                    upTo[i] ? mergeHistory(shown[i], answer, upTo[i]) : answer,
                  );
                  patchState(store, { histories, loadState: 'ready', error: '' });
                },
                error: (error: unknown) =>
                  patchState(store, {
                    loadState: store.histories().length ? 'ready' : 'error',
                    error: serverMessage(error),
                  }),
              }),
              // Older days still coming in: ask again in a moment.
              switchMap((histories) =>
                histories.some((history) => !history.complete) ? timer(MARKET_POLL_MS) : EMPTY,
              ),
              tap(() => loadHistories(true)),
            );
          }),
        ),
      );
      const loadRegions = rxMethod<void>(
        switchMap(() =>
          service.regions().pipe(
            tapResponse({
              next: (regions) => patchState(store, { regions }),
              error: (error: unknown) => patchState(store, { error: serverMessage(error) }),
            }),
          ),
        ),
      );
      const loadItem = rxMethod<number | null>(
        switchMap((id) =>
          id === null || store.known()?.id === id
            ? EMPTY
            : service.item(id).pipe(
                tapResponse({
                  next: ({ item }) => patchState(store, { known: item }),
                  error: (error: unknown) => patchState(store, { error: serverMessage(error) }),
                }),
              ),
        ),
      );
      // Shows `next` and writes it to the query string. Another item, region,
      // quality or first day is read again; the rest is only drawn anew.
      function show(next: MarketSelection) {
        const before = { ...selection(), from: store.range().from };
        patchState(store, next);
        const read =
          next.item !== before.item ||
          next.region !== before.region ||
          next.oceania !== before.oceania ||
          next.quality !== before.quality ||
          store.range().from !== before.from;
        if (read) {
          if (next.item !== before.item || next.region !== before.region) patchState(store, { histories: [] });
          loadItem(next.item);
          loadHistories(false);
        }
        if (route) {
          void router.navigate([], {
            relativeTo: route,
            queryParams: selectionToQuery(next),
            queryParamsHandling: 'merge',
            replaceUrl: !read,
          });
        }
      }
      return {
        // Reads the regions, the item and its history.
        load() {
          loadRegions();
          loadItem(store.item());
          loadHistories(false);
        },
        pick(item: MarketItem) {
          patchState(store, { known: item });
          show({ ...selection(), item: item.id, worlds: [] });
        },
        setRegion: (region: string) => show({ ...selection(), region, worlds: [] }),
        setOceania: (oceania: boolean) => show({ ...selection(), oceania }),
        setQuality: (quality: MarketSelection['quality']) => show({ ...selection(), quality }),
        setScale: (scale: MarketSelection['scale']) => show({ ...selection(), scale }),
        // Draws a world's line, or stops drawing it (at most MAX_WORLDS).
        toggleWorld(key: string) {
          const keys = store.chosen().map((world) => world.key);
          const drawn = keys.includes(key);
          if (!drawn && keys.length >= MAX_WORLDS) return;
          show({ ...selection(), worlds: drawn ? keys.filter((k) => k !== key) : [...keys, key] });
        },
        // The days shown, kept within the history; null: a month ago, today.
        setRange(from: string | null, to: string | null) {
          const range = shownRange({ from, to }, store.start(), store.end(), DEFAULT_DAYS);
          // The default month, and today, are left out of the link.
          const month = daysBefore(store.end(), DEFAULT_DAYS);
          show({
            ...selection(),
            from: from === null || range.from === month ? null : range.from,
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
      store.load();
      // Its first value is what the store started from: nothing to do.
      if (route) store.followQuery(route.queryParamMap);
    },
  })),
);
