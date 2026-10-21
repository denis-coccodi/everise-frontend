import { Service } from '@angular/core';
import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { mechanicsOf } from './mechanics';
import { planMitigation } from './mitigation-plan';
import { Plan, PlanOptions } from './plan.model';
import { mitigationTools } from './tools';

// Plans a pull in the browser. The planner page loads it only when it's
// asked for (injectAsync), keeping it out of the page's own bundle.
@Service()
export class PlannerScheduler {
  // The party's mitigations over the pull, every hit left the margin where
  // the party's cooldowns allow.
  plan(timeline: PullTimeline, catalog: ActionCatalog, options: PlanOptions): Plan {
    const maxHp = new Map<number, number>();
    for (const player of timeline.players) if (player.maxHp) maxHp.set(player.id, player.maxHp);
    return planMitigation(mechanicsOf(timeline), mitigationTools(timeline.players, catalog), maxHp, options);
  }
}
