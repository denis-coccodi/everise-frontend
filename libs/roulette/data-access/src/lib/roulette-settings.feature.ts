import { computed, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { patchState, signalStoreFeature, type, withComputed, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tap } from 'rxjs';
import { DutyGroup, DutyRoulette } from '@everise/core/api-types';
import { PICKED_TYPES, RouletteSettings, RunMode, pickOptions, tidySettings, usualPicks } from './roulette-engine';
import { dutyTypeIds, level, settingsFromQuery, settingsToQuery } from './settings-query';

export type RouletteLoadState = 'loading' | 'ready' | 'empty' | 'error';

// The Duty Finder settings of the roulette's store, a mirror of the page's
// query string (settings-query.ts). Every change, a tick or a new query
// (Back, Forward, a link), goes through show(): the settings are tidied,
// shown, and written back, so the query always says what the page shows.
// Writing replaces the page's history entry rather than adding one per tick.
export function withRouletteSettings<_>() {
  return signalStoreFeature(
    {
      state: type<{
        settings: RouletteSettings;
        spunModes: RunMode[] | null;
        loadState: RouletteLoadState;
        groups: DutyGroup[];
        roulettes: DutyRoulette[];
      }>(),
    },
    withComputed((store) => ({
      // The entries of each picked type.
      pickable: computed(() => pickOptions(store.groups(), store.roulettes())),
      // Each duty type the page lists, with its id in the query string.
      typeIds: computed(() => dutyTypeIds(store.groups())),
    })),
    withMethods((store, router = inject(Router), route = inject(ActivatedRoute)) => {
      const show = (wanted: RouletteSettings) => {
        const types = store.typeIds();
        const settings = tidySettings(
          wanted,
          types.map((t) => t.name),
          store.pickable(),
        );
        if (JSON.stringify(settings) !== JSON.stringify(store.settings())) {
          patchState(store, { settings, spunModes: null });
        }
        // The same URL again is no navigation at all.
        void router.navigate([], {
          relativeTo: route,
          queryParams: settingsToQuery(settings, types),
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      };
      const update = (change: (s: RouletteSettings) => RouletteSettings) => show(change(store.settings()));
      const readQuery = (query: ParamMap) => {
        if (store.loadState() === 'ready') show(settingsFromQuery(query, store.typeIds()));
      };
      // Picked types (Duty Roulettes, PvP, Gold Saucer) that are turned on
      // tick their usual entries, so the reels have something to land on.
      const withTypes = (s: RouletteSettings, types: string[]): RouletteSettings => ({
        ...s,
        types,
        picks: Object.fromEntries(
          PICKED_TYPES.map((type) => [
            type,
            s.types.includes(type) ? (s.picks[type] ?? []) : usualPicks(store.pickable(), type),
          ]),
        ),
      });
      return {
        isTypeOn: (name: string) => store.settings().types.includes(name),
        isPicked: (type: string, key: string) => store.settings().picks[type]?.includes(key) ?? false,
        toggleType: (name: string, on: boolean) => update((s) => withTypes(s, toggled(s.types, name, on))),
        togglePick: (type: string, key: string, on: boolean) =>
          update((s) => ({ ...s, picks: { ...s.picks, [type]: toggled(s.picks[type] ?? [], key, on) } })),
        setAllTypes: (on: boolean) => update((s) => withTypes(s, on ? store.typeIds().map((t) => t.name) : [])),
        setAllPicks: (type: string, on: boolean) => {
          const keys = on ? (store.pickable()[type] ?? []).map((o) => o.key) : [];
          update((s) => ({ ...s, picks: { ...s.picks, [type]: keys } }));
        },
        setLevel: (which: 'minLevel' | 'maxLevel', value: string) => update((s) => ({ ...s, [which]: level(value) })),
        // The query string's settings, once the lists are in.
        readSettings: () => readQuery(route.snapshot.queryParamMap),
        // The query string changed.
        followQuery: rxMethod<ParamMap>(tap(readQuery)),
      };
    }),
  );
}

function toggled<T>(list: T[], item: T, on: boolean) {
  const without = list.filter((x) => x !== item);
  return on ? [...without, item] : without;
}
