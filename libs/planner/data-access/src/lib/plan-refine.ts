import { STRATEGIES, betterPlan } from '@everise/planner/scheduler';
import type { Plan, PlanOptions, Strategy } from '@everise/planner/scheduler';

// After the plain plan, shown first: the plan made the other ways
// (`STRATEGIES`) in turn, while the best so far lets players die, the page
// drawn between each (planning holds it). `planWith` makes them, `keep` is
// told each better one, and `latest` says whether no newer run has begun.
export async function refinePlans<T extends { plan: Plan }>(
  first: T,
  planWith: (strategy: Strategy) => T,
  keep: (best: T) => void,
  latest: () => boolean,
  options: PlanOptions & { maxHp: Map<number, number> },
  paint: () => Promise<unknown>,
) {
  let best = first;
  for (const strategy of STRATEGIES.slice(1)) {
    if (!best.plan.deaths?.length) return;
    await paint();
    if (!latest()) return;
    const next = planWith(strategy);
    if (!betterPlan(next.plan, best.plan, options.maxHp, options)) continue;
    best = next;
    keep(best);
  }
}
