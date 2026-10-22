import { Service } from '@angular/core';
import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { planHeals } from './heal-plan';
import { healPower } from './heal-power';
import { healTools } from './heal-tools';
import { healingBuffsOf } from './healing-buffs';
import { mechanicsOf } from './mechanics';
import { planMitigation } from './mitigation-plan';
import { Plan, PlanOptions } from './plan.model';
import { mitigationTools } from './tools';

// Plans of the pull, at most: the first, and replans around the HP its
// heals leave.
const ROUNDS = 3;

// Plans a pull in the browser. The planner page loads it only when it's
// asked for (injectAsync), keeping it out of the page's own bundle.
@Service()
export class PlannerScheduler {
  // The party's mitigations and shields over the pull, then the healers'
  // heals, every hit left the margin of the player's HP where the party's
  // cooldowns allow. The mitigations are planned first as if every hit
  // landed at full HP; where a hit is still short, again around the HP the
  // heals leave it, then the heals again, as long as that makes the plan
  // better.
  plan(timeline: PullTimeline, catalog: ActionCatalog, options: PlanOptions): Plan {
    const maxHp = new Map<number, number>();
    for (const player of timeline.players) if (player.maxHp) maxHp.set(player.id, player.maxHp);
    const power = healPower(timeline, catalog);
    const mitigation = mitigationTools(timeline.players, catalog, power);
    const heals = healTools(timeline.players, catalog, mitigation, power);
    const mechanics = mechanicsOf(timeline);
    const buffs = healingBuffsOf(catalog);
    const once = (from?: Plan) =>
      planHeals(
        planMitigation(mechanics, mitigation, maxHp, options, from),
        timeline,
        mitigation,
        heals,
        maxHp,
        options,
        buffs,
      );

    let best = once();
    for (let round = 1; round < ROUNDS && best.hits.some((h) => !h.safe); round++) {
      const next = once(best);
      if (!better(next, best, maxHp, options)) break;
      best = next;
    }
    return best;
  }
}

// Fewer hits short of the margin, or as many but short by less.
function better(a: Plan, b: Plan, maxHp: Map<number, number>, options: PlanOptions) {
  const score = (plan: Plan) => {
    const short = plan.hits.filter((h) => !h.safe);
    const by = short.reduce((sum, h) => {
      const margin = options.margin * (maxHp.get(h.player) ?? 0);
      return sum + Math.max(0, margin - ((h.hpBefore ?? 0) - h.planned));
    }, 0);
    return { count: short.length, by };
  };
  const [x, y] = [score(a), score(b)];
  return x.count < y.count || (x.count === y.count && x.by < y.by);
}
