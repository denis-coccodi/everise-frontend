import { injectAsync, onIdle } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { Plan } from '@everise/planner/scheduler';

// The HP margin a plan starts with (percent of max HP), and the range a
// person may set.
export const DEFAULT_MARGIN = 10;
export const MARGIN_RANGE = { min: 0, max: 50 };

interface PlanState {
  // The HP each hit must leave, in percent of max HP.
  margin: number;
  // The last plan, and the pull it's for.
  plan: Plan | null;
  pullId: number | null;
  planning: boolean;
  error: string;
}

// The fight planner's plan for the pull open: the scheduler runs in the
// browser, loaded only once the page is idle or a plan is asked for, so it
// stays out of the page's own bundle. Provided by the tool.
export const PlanStore = signalStore(
  withState<PlanState>({ margin: DEFAULT_MARGIN, plan: null, pullId: null, planning: false, error: '' }),
  withProps(() => ({
    _scheduler: injectAsync(() => import('@everise/planner/scheduler').then((m) => m.PlannerScheduler), {
      prefetch: onIdle,
    }),
  })),
  withMethods((store) => ({
    setMargin(margin: number) {
      patchState(store, { margin });
    },
    // Plans the pull with the margin set.
    async run(pullId: number, timeline: PullTimeline, catalog: ActionCatalog) {
      patchState(store, { planning: true, error: '' });
      try {
        const scheduler = await store._scheduler();
        const plan = scheduler.plan(timeline, catalog, { margin: store.margin() / 100 });
        patchState(store, { plan, pullId, planning: false });
      } catch {
        patchState(store, {
          planning: false,
          error: "The planner couldn't be loaded. Check your connection, then try again.",
        });
      }
    },
  })),
);
