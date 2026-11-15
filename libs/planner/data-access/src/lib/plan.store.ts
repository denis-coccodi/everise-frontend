import { injectAsync, onIdle } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { OpenerId, Plan, PlanEdit, PlanEdits } from '@everise/planner/scheduler';
import { STOPPED, STRATEGIES, type Strategy } from '@everise/planner/scheduler';
import { editWarning as editWarningFor, editsKey, NO_EDITS, saveEdits, storedEdits, withAdded } from './plan-edits';
import { INITIAL_PLAN_STATE, type FailedMechanics, type PlanPlayer, type PlanState } from './plan.model';
import { refinePlans, refines } from './plan-refine';
import { progressOf } from './plan-progress';
import { characterKey, saveReplan, storedReplan } from './plan-replan';

// Whether two plans have the same uses and hits.
const samePlan = (a: Plan, b: Plan) => JSON.stringify([a.uses, a.hits]) === JSON.stringify([b.uses, b.hits]);

const LOAD_ERROR = "The planner couldn't be loaded. Check your connection, then try again.";

// The fight planner's plan for the pull open, and its options: the
// scheduler runs in the browser, loaded only once the page is idle or a plan
// is asked for, so it stays out of the page's own bundle. Provided by the
// tool.
export const PlanStore = signalStore(
  withState<PlanState>(INITIAL_PLAN_STATE),
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
      patchState(store, {
        planning: true,
        improving: false,
        progress: 0,
        error: '',
        editWarning: '',
        sameAsBefore: false,
      });
      const progress = progressOf((share) => latest() && patchState(store, { progress: share }));
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
        const planWith = async (strategy: Strategy, repairDeaths = false) => {
          const baseKey = JSON.stringify({ pullId, ...options, strategy, repairDeaths });
          const kept = store.baseKey() === baseKey ? store.basePlan() : null;
          const asked = { ...options, strategy, repairDeaths };
          const made = (key: string, own: { edits?: PlanEdits }) =>
            progress.track(key, (report) => pool.plan(timeline, catalog, { ...asked, ...own }, report));
          const [plan, base] = await Promise.all([
            made(baseKey + ':edited', { edits }),
            edited ? (kept ?? made(baseKey, {})) : null,
          ]);
          const basePlan = base ?? plan;
          return { plan, basePlan, baseKey, editWarning: edited ? editWarningFor(basePlan, plan) : '' };
        };
        const first = await planWith(STRATEGIES[0]);
        if (!latest()) return;
        const before = store.pullId() === pullId ? store.plan() : null;
        const sameAsBefore = !!before && samePlan(before, first.plan);
        const improving = refines(first.plan);
        patchState(store, { ...first, timeline, pullId, planning: false, sameAsBefore, improving });
        progress.clear();
        const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp ?? 0]));
        // Once the strategies are weighed, those still being made aren't needed.
        const weighed = () => (pool.stop(), progress.clear());
        const keep = (best: typeof first) => patchState(store, best);
        await refinePlans(first, planWith, keep, latest, { ...options, maxHp }, weighed);
        if (!latest()) return;
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
