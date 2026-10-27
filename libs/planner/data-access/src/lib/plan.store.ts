import { injectAsync, onIdle } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { Favour, InvulnerabilityChoice, InvulnerabilityOptions, OpenerId, Plan } from '@everise/planner/scheduler';
import type { InvulnerabilitySetting, PlanPlayer } from './plan.model';

// The HP margin a plan starts with (percent of max HP), and the range a
// person may set.
export const DEFAULT_MARGIN = 10;
export const MARGIN_RANGE = { min: 0, max: 50 };

// The players last replanned, remembered in this browser so the next
// report replans them by default (the member's own character, mostly):
// "<name>@<server>" each, as JSON.
const REPLAN_KEY = 'planner.replan';

const characterKey = (p: { name: string; server: string | null }) => `${p.name}@${p.server ?? ''}`;

const LOAD_ERROR = "The planner couldn't be loaded. Check your connection, then try again.";

interface PlanState {
  // The HP each hit must leave, in percent of max HP.
  margin: number;
  // For the pull open: the players to replan (ids), the tanks'
  // invulnerabilities where the plan must use them, and what there is to
  // choose from.
  preparedFor: number | null;
  players: PlanPlayer[];
  replan: number[];
  invulnerabilities: InvulnerabilityChoice[];
  // What each player favours, damage (left out) or healing, by id.
  favour: Record<number, Favour>;
  // The opener each player starts with, the standard one (left out) or
  // another (`OPENERS`), by id.
  openers: Record<number, OpenerId>;
  invulnerabilityOptions: InvulnerabilityOptions | null;
  // The last plan, and the pull it's for.
  plan: Plan | null;
  pullId: number | null;
  planning: boolean;
  error: string;
}

// The fight planner's plan for the pull open, and its options: the
// scheduler runs in the browser, loaded only once the page is idle or a plan
// is asked for, so it stays out of the page's own bundle. Provided by the
// tool.
export const PlanStore = signalStore(
  withState<PlanState>({
    margin: DEFAULT_MARGIN,
    preparedFor: null,
    players: [],
    replan: [],
    invulnerabilities: [],
    favour: {},
    openers: {},
    invulnerabilityOptions: null,
    plan: null,
    pullId: null,
    planning: false,
    error: '',
  }),
  withProps(() => ({
    _scheduler: injectAsync(() => import('@everise/planner/scheduler').then((m) => m.PlannerScheduler), {
      prefetch: onIdle,
    }),
  })),
  withMethods((store) => {
    // Who to replan, remembered for the next reports.
    const replanOnly = (playerIds: number[]) => {
      const keys = store
        .players()
        .filter((p) => playerIds.includes(p.id))
        .map(characterKey);
      try {
        localStorage.setItem(REPLAN_KEY, JSON.stringify(keys));
      } catch {
        // Not remembered; it still applies to this visit.
      }
      patchState(store, { replan: playerIds });
    };
    return {
      setMargin(margin: number) {
        patchState(store, { margin });
      },
      // The options for a pull just opened: those last replanned replanned
      // again, the invulnerabilities where the pull had them.
      async prepare(pullId: number, timeline: PullTimeline, catalog: ActionCatalog, players: PlanPlayer[]) {
        if (store.preparedFor() === pullId) return;
        const remembered = storedReplan();
        patchState(store, {
          preparedFor: pullId,
          players,
          replan: players.filter((p) => remembered.includes(characterKey(p))).map((p) => p.id),
          invulnerabilities: [],
          favour: {},
          openers: {},
          invulnerabilityOptions: null,
        });
        try {
          const options = (await store._scheduler()).invulnerabilityOptions(timeline, catalog);
          if (store.preparedFor() !== pullId) return;
          patchState(store, { invulnerabilityOptions: options, invulnerabilities: options.played });
        } catch {
          patchState(store, { error: LOAD_ERROR });
        }
      },
      setReplanned(playerId: number, on: boolean) {
        const others = store.replan().filter((id) => id !== playerId);
        replanOnly(on ? [...others, playerId] : others);
      },
      replanOnly,
      // One of a tank's invulnerability choices (`index` in the list), or a
      // new one for an invulnerability that has none.
      setFavour(player: number, favour: Favour) {
        patchState(store, { favour: { ...store.favour(), [player]: favour } });
      },
      setOpener(player: number, opener: OpenerId) {
        patchState(store, { openers: { ...store.openers(), [player]: opener } });
      },
      setInvulnerability(player: number, action: number, index: number | null, setting: InvulnerabilitySetting) {
        const list = [...store.invulnerabilities()];
        if (setting === 'planner') {
          if (index !== null) list.splice(index, 1);
        } else {
          const choice = { player, action, mechanic: setting === 'never' ? null : setting };
          if (index === null) list.push(choice);
          else list[index] = choice;
        }
        patchState(store, { invulnerabilities: list });
      },
      // Plans the pull with the options set.
      async run(pullId: number, timeline: PullTimeline, catalog: ActionCatalog) {
        patchState(store, { planning: true, error: '' });
        try {
          const scheduler = await store._scheduler();
          const plan = scheduler.plan(timeline, catalog, {
            margin: store.margin() / 100,
            replan: store.replan(),
            invulnerabilities: store.invulnerabilities(),
            favour: store.favour(),
            openers: store.openers(),
          });
          patchState(store, { plan, pullId, planning: false });
        } catch {
          patchState(store, { planning: false, error: LOAD_ERROR });
        }
      },
    };
  }),
);

function storedReplan(): string[] {
  try {
    const keys: unknown = JSON.parse(localStorage.getItem(REPLAN_KEY) ?? '[]');
    return Array.isArray(keys) ? keys.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}
