import { inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { patchState, signalStoreFeature, type, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tap } from 'rxjs';
import { DutyGroup, DutyRoulette } from '@everise/core/api-types';
import { RouletteSettings, RunMode, defaultSettings, pickOptions, typeCandidates } from './roulette-engine';
import { settingsFromQuery, settingsToQuery } from './settings-query';

export type RouletteLoadState = 'loading' | 'ready' | 'empty' | 'error';

// The Duty Finder settings of the roulette's store, kept in the page's query
// string (settings-query.ts): read when the lists load and whenever the
// query changes (Back, Forward, a link), written on every change. A change
// replaces the page's history entry rather than adding one per tick.
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
    withMethods((store, router = inject(Router), route = inject(ActivatedRoute)) => {
      const pickable = () => pickOptions(store.groups(), store.roulettes());
      const defaults = () => defaultSettings(pickable());
      const update = (change: (s: RouletteSettings) => RouletteSettings) => {
        const settings = change(store.settings());
        patchState(store, { settings, spunModes: null });
        void router.navigate([], {
          relativeTo: route,
          queryParams: settingsToQuery(settings, defaults()),
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      };
      return {
        isTypeOn: (name: string) => store.settings().types.includes(name),
        isPicked: (type: string, key: string) => store.settings().picks[type]?.includes(key) ?? false,
        toggleType: (name: string, on: boolean) => update((s) => ({ ...s, types: toggled(s.types, name, on) })),
        togglePick: (type: string, key: string, on: boolean) =>
          update((s) => ({ ...s, picks: { ...s.picks, [type]: toggled(s.picks[type] ?? [], key, on) } })),
        setAllTypes: (on: boolean) =>
          update((s) => ({
            ...s,
            types: on ? typeCandidates(store.groups(), pickable(), s).map((t) => t.name) : [],
          })),
        setAllPicks: (type: string, on: boolean) => {
          const keys = on ? (pickable()[type] ?? []).map((o) => o.key) : [];
          update((s) => ({ ...s, picks: { ...s.picks, [type]: keys } }));
        },
        setLevel: (which: 'minLevel' | 'maxLevel', value: string) => {
          const level = value.trim() === '' ? null : Math.max(1, Math.min(100, Math.floor(Number(value))));
          update((s) => ({ ...s, [which]: Number.isNaN(level) ? null : level }));
        },
        // The settings the query string asks for, once the lists are in.
        readSettings: () =>
          patchState(store, { settings: settingsFromQuery(route.snapshot.queryParamMap, defaults()) }),
        // The query string changed: its settings, unless they're these.
        followQuery: rxMethod<ParamMap>(
          tap((query) => {
            if (store.loadState() !== 'ready') return;
            const settings = settingsFromQuery(query, defaults());
            if (JSON.stringify(settings) !== JSON.stringify(store.settings())) {
              patchState(store, { settings, spunModes: null });
            }
          }),
        ),
      };
    }),
  );
}

function toggled<T>(list: T[], item: T, on: boolean) {
  const without = list.filter((x) => x !== item);
  return on ? [...without, item] : without;
}
