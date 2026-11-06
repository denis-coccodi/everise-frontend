import type { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { PlanJob, PlanReply } from './plan-pool.model';
import { PullPlanner } from './pull-planner';

// A planning worker (`PlanPool`): plans the pull it was last sent, off the
// page, so the page stays usable while it plans.
const planner = new PullPlanner();
let timeline: PullTimeline | null = null;
let catalog: ActionCatalog | null = null;

addEventListener('message', ({ data }: MessageEvent<PlanJob>) => {
  timeline = data.timeline ?? timeline;
  catalog = data.catalog ?? catalog;
  let reply: PlanReply;
  try {
    if (!timeline || !catalog) throw new Error('No pull to plan.');
    reply = { plan: planner.plan(timeline, catalog, data.options) };
  } catch (e) {
    reply = { error: e instanceof Error ? e.message : String(e) };
  }
  postMessage(reply);
});
