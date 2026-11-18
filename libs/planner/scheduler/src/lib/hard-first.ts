import { deadIn } from './plan-score';
import type { Mechanic, Plan } from './plan.model';

// How many times the heals are planned again with more mechanics first.
const TRIES = 2;

// The mechanics in the order their heals are planned: those `first`, then the rest, each in time order.
export function inPlanningOrder(mechanics: Mechanic[], first: Set<number>) {
  if (!first.size) return mechanics;
  return [...mechanics.filter((m) => first.has(m.id)), ...mechanics.filter((m) => !first.has(m.id))];
}

// The mechanics whose hits the plan leaves short.
function shortIn(plan: Plan) {
  return plan.hits.filter((h) => !h.safe && !h.avoidable).map((h) => h.mechanic);
}

// Heals planned in time order spend a cooldown on the first need they meet, even one a harder hit later needed.
// Where the plan leaves hits short, their mechanics' heals are planned first (`replan`), the rest's around them,
// with theirs in the recast, pool and MP checks; again with those it then leaves short too. Each kept if better
// (no more players dying, to any damage, and `better`), stopping at the first that isn't.
export function hardFirst<P extends Plan>(plan: P, replan: (first: Set<number>) => P, better: (a: P, b: P) => boolean) {
  let best = plan;
  let first = new Set<number>();
  for (let n = 0; n < TRIES; n++) {
    const next = new Set([...first, ...shortIn(best)]);
    if (next.size === first.size) break;
    const tried = replan(next);
    const [now, was] = [deadIn(tried), deadIn(best)];
    if (now > was || (now === was && !better(tried, best))) break;
    best = tried;
    first = next;
  }
  return { plan: best, first };
}
