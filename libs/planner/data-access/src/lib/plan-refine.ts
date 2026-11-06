import { STRATEGIES, betterPlan } from '@everise/planner/scheduler';
import type { Plan, PlanOptions, Strategy } from '@everise/planner/scheduler';

// After the plain plan, shown first: the plan made the other ways
// (`STRATEGIES`), while the best so far lets players die. They're all asked
// for at once (`planWith`; workers make them side by side) and weighed in
// order, as each comes: `keep` is told each better one, and `latest` says
// whether no newer run has begun.
export async function refinePlans<T extends { plan: Plan }>(
  first: T,
  planWith: (strategy: Strategy) => Promise<T>,
  keep: (best: T) => void,
  latest: () => boolean,
  options: PlanOptions & { maxHp: Map<number, number> },
) {
  let best = first;
  if (!best.plan.deaths?.length) return;
  const tries = STRATEGIES.slice(1).map(planWith);
  // Weighed in order below; a failure is met there.
  for (const t of tries) t.catch(() => undefined);
  for (const t of tries) {
    const next = await t;
    if (!latest()) return;
    if (betterPlan(next.plan, best.plan, options.maxHp, options)) {
      best = next;
      keep(best);
    }
    if (!best.plan.deaths?.length) return;
  }
}
