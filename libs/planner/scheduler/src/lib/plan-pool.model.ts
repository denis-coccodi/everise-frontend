import type { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { Plan, PlanOptions } from './plan.model';

// What the page sends a planning worker: the pull and catalog only when the
// worker doesn't hold them already, from the job before.
export interface PlanJob {
  timeline?: PullTimeline;
  catalog?: ActionCatalog;
  options: PlanOptions;
}

// What it sends back: how far the plan has got (0 to 1) while it plans,
// then the plan, or why there's none.
export type PlanReply = { progress: number } | { plan: Plan } | { error: string };
