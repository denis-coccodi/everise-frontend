import { injectAsync, onIdle } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { Favour, InvulnerabilityOptions, OpenerId, Plan, PlanEdit, PlanEdits } from '@everise/planner/scheduler';
import { editWarning, editsKey, NO_EDITS, saveEdits, storedEdits } from './plan-edits';
import type { FailedMechanics, PlanPlayer } from './plan.model';

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
  // Failed mechanics: covered like any other hit, or taken as avoided.
  failedMechanics: FailedMechanics;
  // For the pull open: the players to replan (ids).
  preparedFor: number | null;
  players: PlanPlayer[];
  replan: number[];
  // What each player favours, damage (left out) or healing, by id.
  favour: Record<number, Favour>;
  // A replanned astrologian's other Lightspeed charge, by id: as played
  // (left out) or planned.
  lightspeed: Record<number, 'logged' | 'replan'>;
  // The opener each player starts with, the standard one (left out) or
  // another (`OPENERS`), by id.
  openers: Record<number, OpenerId>;
  invulnerabilityOptions: InvulnerabilityOptions | null;
  // The user's edits to the pull's plan, the key they're remembered by, and
  // what the last one did when it left more hits short.
  edits: PlanEdits;
  editsKey: string;
  editWarning: string;
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
    failedMechanics: 'cover',
    preparedFor: null,
    players: [],
    replan: [],
    favour: {},
    lightspeed: {},
    openers: {},
    invulnerabilityOptions: null,
    edits: NO_EDITS,
    editsKey: '',
    editWarning: '',
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
    // Plans the pull with the options set.
    const run = async (pullId: number, timeline: PullTimeline, catalog: ActionCatalog) => {
      patchState(store, { planning: true, error: '' });
      try {
        const scheduler = await store._scheduler();
        const plan = scheduler.plan(timeline, catalog, {
          margin: store.margin() / 100,
          failedMechanics: store.failedMechanics(),
          replan: store.replan(),
          favour: store.favour(),
          lightspeed: store.lightspeed(),
          openers: store.openers(),
          edits: store.edits(),
        });
        patchState(store, { plan, pullId, planning: false });
      } catch {
        patchState(store, { planning: false, error: LOAD_ERROR });
      }
    };
    // An edit, saved for the pull, then the plan again: the hits it leaves
    // short that weren't before.
    const edited = async (
      pullId: number,
      timeline: PullTimeline,
      catalog: ActionCatalog,
      change: (edits: PlanEdits) => PlanEdits,
    ) => {
      const edits = change(store.edits());
      saveEdits(store.editsKey(), edits);
      const before = store.plan();
      patchState(store, { edits });
      await run(pullId, timeline, catalog);
      patchState(store, { editWarning: editWarning(before, store.plan()) });
    };
    return {
      setMargin(margin: number) {
        patchState(store, { margin });
      },
      setFailedMechanics(failedMechanics: FailedMechanics) {
        patchState(store, { failedMechanics });
      },
      // The options for a pull just opened: those last replanned replanned
      // again, the user's edits to it, and the tanks' invulnerabilities (for
      // the plan view's words on those it couldn't use).
      async prepare(pullId: number, timeline: PullTimeline, catalog: ActionCatalog, players: PlanPlayer[]) {
        if (store.preparedFor() === pullId) return;
        const remembered = storedReplan();
        patchState(store, {
          preparedFor: pullId,
          players,
          replan: players.filter((p) => remembered.includes(characterKey(p))).map((p) => p.id),
          favour: {},
          lightspeed: {},
          openers: {},
          invulnerabilityOptions: null,
          edits: storedEdits(editsKey(timeline.code, pullId)),
          editsKey: editsKey(timeline.code, pullId),
          editWarning: '',
        });
        try {
          const options = (await store._scheduler()).invulnerabilityOptions(timeline, catalog);
          if (store.preparedFor() !== pullId) return;
          patchState(store, { invulnerabilityOptions: options });
        } catch {
          patchState(store, { error: LOAD_ERROR });
        }
      },
      setReplanned(playerId: number, on: boolean) {
        const others = store.replan().filter((id) => id !== playerId);
        replanOnly(on ? [...others, playerId] : others);
      },
      replanOnly,
      setFavour(player: number, favour: Favour) {
        patchState(store, { favour: { ...store.favour(), [player]: favour } });
      },
      setLightspeed(player: number, second: 'logged' | 'replan') {
        patchState(store, { lightspeed: { ...store.lightspeed(), [player]: second } });
      },
      setOpener(player: number, opener: OpenerId) {
        patchState(store, { openers: { ...store.openers(), [player]: opener } });
      },
      run,
      // A skill the user puts in the plan (with what it needs first), or takes out (one they added
      // comes out of their edits; a planned one isn't planned there again),
      // or one of their edits or all of them undone; each plans the pull
      // again, saying so when it leaves more hits short than before.
      async addSkill(pullId: number, timeline: PullTimeline, catalog: ActionCatalog, ...added: PlanEdit[]) {
        await edited(pullId, timeline, catalog, (e) => ({ ...e, added: [...e.added, ...added] }));
      },
      async removeSkill(
        pullId: number,
        timeline: PullTimeline,
        catalog: ActionCatalog,
        use: PlanEdit & { edited?: boolean },
      ) {
        const same = (e: PlanEdit) => e.player === use.player && e.action === use.action && e.at === use.at;
        const { player, action, at } = use;
        await edited(pullId, timeline, catalog, (e) =>
          use.edited
            ? { ...e, added: e.added.filter((a) => !same(a)) }
            : { ...e, removed: [...e.removed, { player, action, at }] },
        );
      },
      async undoEdit(
        pullId: number,
        timeline: PullTimeline,
        catalog: ActionCatalog,
        kind: keyof PlanEdits,
        edit: PlanEdit,
      ) {
        await edited(pullId, timeline, catalog, (e) => ({ ...e, [kind]: e[kind].filter((x) => x !== edit) }));
      },
      async resetEdits(pullId: number, timeline: PullTimeline, catalog: ActionCatalog) {
        await edited(pullId, timeline, catalog, () => NO_EDITS);
        patchState(store, { editWarning: '' });
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
