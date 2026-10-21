import { Service } from '@angular/core';
import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { planHeals } from './heal-plan';
import { healPower } from './heal-power';
import { healTools } from './heal-tools';
import { mechanicsOf } from './mechanics';
import { planMitigation } from './mitigation-plan';
import { Plan, PlanOptions } from './plan.model';
import { mitigationTools } from './tools';

// Plans a pull in the browser. The planner page loads it only when it's
// asked for (injectAsync), keeping it out of the page's own bundle.
@Service()
export class PlannerScheduler {
  // The party's mitigations and shields over the pull, then the healers'
  // heals, every hit left the margin of the player's HP where the party's
  // cooldowns allow.
  plan(timeline: PullTimeline, catalog: ActionCatalog, options: PlanOptions): Plan {
    const maxHp = new Map<number, number>();
    for (const player of timeline.players) if (player.maxHp) maxHp.set(player.id, player.maxHp);
    const power = healPower(timeline, catalog);
    const mitigation = mitigationTools(timeline.players, catalog, power);
    const heals = healTools(timeline.players, catalog, mitigation, power);
    const plan = planMitigation(mechanicsOf(timeline), mitigation, maxHp, options);
    return planHeals(plan, timeline, mitigation, heals, maxHp, options);
  }
}
