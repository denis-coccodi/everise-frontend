import { injectAsync, onIdle } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { InvulnerabilityOptions, OpenerId, Plan, PlanEdit, PlanEdits } from '@everise/planner/scheduler';
import { STOPPED, STRATEGIES, type ReferencedTimeline, type Strategy } from '@everise/planner/scheduler';
import { editWarning as editWarningFor, editsKey, NO_EDITS, saveEdits, storedEdits, withAdded } from './plan-edits';
import type { FailedMechanics, PlanPlayer } from './plan.model';
import { refinePlans } from './plan-refine';
import { characterKey, saveReplan, storedReplan } from './plan-replan';

// The HP margin a plan starts with (percent of max HP), and the range a
// person may set.
export const DEFAULT_MARGIN = 10;
export const MARGIN_RANGE = { min: 0, max: 50 };

// Whether two plans have the same uses and hits.
const samePlan = (a: Plan, b: Plan) => JSON.stringify([a.uses, a.hits]) === JSON.stringify([b.uses, b.hits]);

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
  // A replanned astrologian's other Lightspeed charge, by id: as played
  // (left out) or planned.
  lightspeed: Record<number, 'logged' | 'replan'>;
  // The opener each player starts with, the standard one (left out) or
  // another (`OPENERS`), by id.
  openers: Record<number, OpenerId>;
  invulnerabilityOptions: InvulnerabilityOptions | null;
  // The user's edits to the pull's plan, the key they're remembered by, and
  // the hits they leave short that the plan without them doesn't.
  edits: PlanEdits;
  editsKey: string;
  editWarning: string;
  // The plan without the edits, and the options it was made with, to
  // compare against (made again only when those change).
  basePlan: Plan | null;
  baseKey: string;
  // The last plan, the pull and timeline it's for, and whether planning again changed nothing.
  plan: Plan | null;
  timeline: ReferencedTimeline | null;
  sameAsBefore: boolean;
  pullId: number | null;
  planning: boolean;
  // Shown, and looking for a better plan made another way (`refinePlans`).
  improving: boolean;
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
    lightspeed: {},
    openers: {},
    invulnerabilityOptions: null,
    edits: NO_EDITS,
    editsKey: '',
    editWarning: '',
    basePlan: null,
    baseKey: '',
    plan: null,
    timeline: null,
    sameAsBefore: false,
    pullId: null,
    planning: false,
    improving: false,
    error: '',
  }),
  withProps(() => ({
    _scheduler: injectAsync(() => import('@everise/planner/scheduler').then((m) => m.PlannerScheduler), {
      prefetch: onIdle,
    }),
    _pool: injectAsync(() => import('@everise/planner/scheduler').then((m) => m.PlanPool), { prefetch: onIdle }),
  })),
  withMethods((store) => {
    // Who to replan, remembered for the next reports.
    const replanOnly = (playerIds: number[]) => {
      saveReplan(
        store
          .players()
          .filter((p) => playerIds.includes(p.id))
          .map(characterKey),
      );
      patchState(store, { replan: playerIds });
    };
    // A run's number: a newer run stops an older one's looking further.
    let runs = 0;
    // Plans the pull with the options set, and with the user's edits, says
    // what they leave short that the plan without them doesn't: a move (out
    // of one place, into another) reads as one change, whatever the steps.
    // The plain plan shows first; where it lets players die, the other ways
    // are tried after it, a better one shown when found.
    const run = async (pullId: number, timeline: PullTimeline, catalog: ActionCatalog) => {
      const runId = ++runs;
      const latest = () => runId === runs;
      patchState(store, { planning: true, improving: false, error: '', editWarning: '', sameAsBefore: false });
      try {
        // Planned in workers, off the page; an older run's plans are dropped.
        const pool = await store._pool();
        pool.stop();
        const options = {
          margin: store.margin() / 100,
          failedMechanics: store.failedMechanics(),
          replan: store.replan(),
          lightspeed: store.lightspeed(),
          openers: store.openers(),
        };
        const edits = store.edits();
        const edited = edits.added.length + edits.removed.length > 0;
        // The plan with the edits, and the one without (kept while its options stay), made one way.
        const planWith = async (strategy: Strategy) => {
          const baseKey = JSON.stringify({ pullId, ...options, strategy });
          const kept = store.baseKey() === baseKey ? store.basePlan() : null;
          const [plan, base] = await Promise.all([
            pool.plan(timeline, catalog, { ...options, edits, strategy }),
            edited ? (kept ?? pool.plan(timeline, catalog, { ...options, strategy })) : null,
          ]);
          const basePlan = base ?? plan;
          return { plan, basePlan, baseKey, editWarning: edited ? editWarningFor(basePlan, plan) : '' };
        };
        const first = await planWith(STRATEGIES[0]);
        if (!latest()) return;
        const before = store.pullId() === pullId ? store.plan() : null;
        const sameAsBefore = !!before && samePlan(before, first.plan);
        const improving = !!first.plan.deaths?.length;
        patchState(store, { ...first, timeline, pullId, planning: false, sameAsBefore, improving });
        const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp ?? 0]));
        await refinePlans(first, planWith, (best) => patchState(store, best), latest, { ...options, maxHp });
        if (!latest()) return;
        // Those still being made when nobody died any more aren't needed.
        pool.stop();
        patchState(store, { improving: false });
      } catch (e) {
        if (e !== STOPPED && latest()) patchState(store, { planning: false, improving: false, error: LOAD_ERROR });
      }
    };
    // An edit, saved for the pull, then the plan again.
    const edited = async (
      pullId: number,
      timeline: PullTimeline,
      catalog: ActionCatalog,
      change: (edits: PlanEdits) => PlanEdits,
    ) => {
      const edits = change(store.edits());
      saveEdits(store.editsKey(), edits);
      patchState(store, { edits });
      // Not planned yet (a reload): kept for when it is.
      if (store.pullId() !== pullId || !store.plan()) return;
      await run(pullId, timeline, catalog);
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
        await edited(pullId, timeline, catalog, (e) => withAdded(e, added));
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
      },
    };
  }),
);
