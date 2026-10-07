import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { DutyGroup, DutyRoulette, Job, RoulettePostRequest } from '@realworld/core/api-types';
import { serverMessage } from '@realworld/core/forms';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { DutiesService } from './duties.service';
import {
  PICKED_TYPES,
  ROULETTES_TYPE,
  RouletteSettings,
  RunMode,
  candidateDetail,
  candidateName,
  dealableJobs,
  defaultSettings,
  eligibleTypes,
  pickOptions,
  possibleModes,
  todaysFrontline,
  typeCandidates,
  upgradeSettings,
} from './roulette-engine';
import { loadSettings, saveSettings } from './settings-storage';

// setTimeout's longest wait (about 24.8 days).
const MAX_TIMEOUT_MS = 2 ** 31 - 1;
// A moment after the daily reset, so the backend is on the new day.
const AFTER_RESET_MS = 2000;

export type RouletteLoadState = 'loading' | 'ready' | 'empty' | 'error';

interface RouletteState {
  loadState: RouletteLoadState;
  groups: DutyGroup[];
  roulettes: DutyRoulette[];
  jobs: Job[];
  rouletteIcon: number | null;
  // The next daily reset, when the Frontline map changes (null if unknown).
  dayEndsAt: Date | null;
  // The Duty Finder settings, saved in the browser.
  settings: RouletteSettings;
  // The third reel's choices after a spin: the winning duty's party settings,
  // until the settings change.
  spunModes: RunMode[] | null;
  // Posting the accepted result: while it's posted, why it failed, the post.
  posting: boolean;
  postError: string | null;
  posted: { articleId: string } | null;
}

const initialState: RouletteState = {
  loadState: 'loading',
  groups: [],
  roulettes: [],
  jobs: [],
  rouletteIcon: null,
  dayEndsAt: null,
  settings: defaultSettings({}),
  spunModes: null,
  posting: false,
  postError: null,
  posted: null,
};

// The Duty Roulette page's state: the game data, the Duty Finder settings
// and what they allow, the daily Frontline map, and posting a result. The
// page spins the reels; this decides what they can land on. Provided by the
// page, so it starts and ends with it.
export const RouletteStore = signalStore(
  withState<RouletteState>(initialState),
  withComputed((store, duties = inject(DutiesService)) => {
    const pickable = computed(() => pickOptions(store.groups(), store.roulettes()));
    const frontlineMap = computed(() => todaysFrontline(store.groups()));
    // The daily reset in the reader's time: 17:00 in Italy in summer, 16:00
    // in winter, as the game keeps it on UTC.
    const frontlineChangesAt = computed(() => {
      const at = store.dayEndsAt();
      return at ? at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    });
    // The jobs dealer's choice deals; without any it isn't offered.
    const dealable = computed(() => dealableJobs(store.jobs()));
    // Each duty type's icon, by type name.
    const typeIcons = computed(
      () =>
        new Map<string, string | undefined>([
          ...store.groups().map((g): [string, string | undefined] => [g.name, duties.imageUrl(g.icon)]),
          [ROULETTES_TYPE, duties.imageUrl(store.rouletteIcon())],
        ]),
    );
    // The types the reels can land on, with their candidates.
    const options = computed(() => eligibleTypes(store.groups(), pickable(), store.settings()));
    const levelError = computed(() => {
      const { minLevel, maxLevel } = store.settings();
      return minLevel !== null && maxLevel !== null && minLevel > maxLevel
        ? 'The minimum level is above the maximum level.'
        : '';
    });
    return {
      pickable,
      frontlineMap,
      frontlineChangesAt,
      dealable,
      typeIcons,
      options,
      levelError,
      // Each type with how many of its duties are within the level limits.
      types: computed(() =>
        typeCandidates(store.groups(), pickable(), store.settings()).map((t) => ({
          name: t.name,
          count: t.candidates.length,
          icon: typeIcons().get(t.name),
        })),
      ),
      // The lists of picked types (roulettes, PvP, Gold Saucer) that are on.
      pickLists: computed(() =>
        PICKED_TYPES.filter((type) => store.settings().types.includes(type)).map((type) => ({
          type,
          options: (pickable()[type] ?? []).map((o) => ({
            key: o.key,
            name: candidateName(o.candidate),
            detail: candidateDetail(o.candidate, frontlineMap(), frontlineChangesAt()),
          })),
        })),
      ),
      modes: computed(() => store.spunModes() ?? possibleModes(options(), dealable().length > 0)),
      ready: computed(() => store.loadState() === 'ready' && !levelError() && options().length > 0),
    };
  }),
  withMethods((store, duties = inject(DutiesService)) => {
    const updateSettings = (change: (s: RouletteSettings) => RouletteSettings) => {
      const settings = change(store.settings());
      patchState(store, { settings, spunModes: null });
      saveSettings(settings);
    };
    return {
      imageUrl: (id: number | null | undefined) => duties.imageUrl(id),
      isTypeOn: (name: string) => store.settings().types.includes(name),
      isPicked: (type: string, key: string) => store.settings().picks[type]?.includes(key) ?? false,
      toggleType: (name: string, on: boolean) => updateSettings((s) => ({ ...s, types: toggled(s.types, name, on) })),
      togglePick: (type: string, key: string, on: boolean) =>
        updateSettings((s) => ({ ...s, picks: { ...s.picks, [type]: toggled(s.picks[type] ?? [], key, on) } })),
      setAllTypes: (on: boolean) =>
        updateSettings((s) => ({ ...s, types: on ? store.types().map((t) => t.name) : [] })),
      setAllPicks: (type: string, on: boolean) => {
        const keys = on ? (store.pickable()[type] ?? []).map((o) => o.key) : [];
        updateSettings((s) => ({ ...s, picks: { ...s.picks, [type]: keys } }));
      },
      setLevel: (which: 'minLevel' | 'maxLevel', value: string) => {
        const level = value.trim() === '' ? null : Math.max(1, Math.min(100, Math.floor(Number(value))));
        updateSettings((s) => ({ ...s, [which]: Number.isNaN(level) ? null : level }));
      },
      // The third reel offers only what the spun duty allows.
      setSpunModes: (modes: RunMode[]) => patchState(store, { spunModes: modes }),
      // A new spin: the last one's post is forgotten.
      clearPost: () => patchState(store, { posted: null, postError: null }),
      load: rxMethod<void>(
        pipe(
          switchMap(() =>
            duties.getDutyLists().pipe(
              tapResponse({
                next: ({ groups, roulettes, rouletteIcon, jobs, dayEndsAt }) => {
                  patchState(store, { groups, roulettes, rouletteIcon, jobs, dayEndsAt });
                  patchState(store, {
                    settings: upgradeSettings(loadSettings(), defaultSettings(store.pickable())),
                    loadState: groups.length > 0 ? 'ready' : 'empty',
                  });
                },
                error: () => patchState(store, { loadState: 'error' }),
              }),
            ),
          ),
        ),
      ),
      // The duties again, for the next game day's Frontline map. A failure is
      // tried again when the page is next shown.
      readNewDay: rxMethod<void>(
        pipe(
          switchMap(() =>
            duties.getDutyGroups().pipe(
              tapResponse({
                next: ({ groups, dayEndsAt }) => patchState(store, { groups, dayEndsAt }),
                error: () => undefined,
              }),
            ),
          ),
        ),
      ),
      // Posts the accepted result to the feeds; a guest's is posted by Tataru.
      post: rxMethod<RoulettePostRequest>(
        pipe(
          tap(() => patchState(store, { posting: true, postError: null })),
          exhaustMap((request) =>
            duties.postResult(request).pipe(
              tapResponse({
                next: ({ article }) => patchState(store, { posting: false, posted: { articleId: article.id } }),
                error: (error: unknown) => patchState(store, { posting: false, postError: serverMessage(error) }),
              }),
            ),
          ),
        ),
      ),
    };
  }),
  withHooks((store) => {
    let dayEndTimer: ReturnType<typeof setTimeout> | undefined;
    // A page left open past the daily reset reads the new Frontline map.
    // Timers wait longer in a hidden tab or a sleeping computer, so coming
    // back to the page checks too.
    const onVisible = () => {
      const at = store.dayEndsAt();
      if (document.visibilityState === 'visible' && at && Date.now() >= at.getTime()) store.readNewDay();
    };
    return {
      onInit() {
        store.load();
        document.addEventListener('visibilitychange', onVisible);
        // Each time the day's end is known, wait for it.
        rxMethod<Date | null>(
          tap((at) => {
            clearTimeout(dayEndTimer);
            if (!at) return;
            const delay = Math.min(at.getTime() - Date.now() + AFTER_RESET_MS, MAX_TIMEOUT_MS);
            dayEndTimer = setTimeout(() => store.readNewDay(), Math.max(delay, 0));
          }),
        )(store.dayEndsAt);
      },
      onDestroy() {
        document.removeEventListener('visibilitychange', onVisible);
        clearTimeout(dayEndTimer);
      },
    };
  }),
);

function toggled<T>(list: T[], item: T, on: boolean) {
  const without = list.filter((x) => x !== item);
  return on ? [...without, item] : without;
}
