import type { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { Plan, PlanOptions } from './plan.model';

// What the page sends a planning worker: the pull and catalog only when the
// worker doesn't hold them already, from the job before.
export interface PlanJob {
  timeline?: PullTimeline;
  catalog?: ActionCatalog;
  options: PlanOptions;
}

// What it sends back: the plan, or why there's none.
export type PlanReply = { plan: Plan } | { error: string };
