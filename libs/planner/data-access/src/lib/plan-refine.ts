import { STRATEGIES, betterPlan, strategiesAfter, worthImproving } from '@everise/planner/scheduler';
import type { Plan, PlanOptions, Strategy } from '@everise/planner/scheduler';

// After the plain plan, shown first, what the planner does for the best
// plan (`bestOfStrategies`, then `repairDeaths`), its plans made side by
// side in workers: the other strategies (`strategiesAfter`) are asked for at
// once (`planWith`) and weighed in order, as each comes, while the best so
// far is `worthImproving`; then, where players still die, the best way's
// plan with its deaths mended a cooldown at a time (`repair`). `keep` is
// told each better plan, `weighed` when the strategies are (those still
// being made aren't needed), and `latest` says whether no newer run has begun.
export async function refinePlans<T extends { plan: Plan }>(
  first: T,
  planWith: (strategy: Strategy, repair?: boolean) => Promise<T>,
  keep: (best: T) => void,
  latest: () => boolean,
  options: PlanOptions & { maxHp: Map<number, number> },
  weighed: () => void,
) {
  const better = (a: T, b: T) => betterPlan(a.plan, b.plan, options.maxHp, options);
  let [best, strategy] = [first, STRATEGIES[0]];
  if (worthImproving(first.plan)) {
    const ways = strategiesAfter(first.plan);
    const tries = ways.map((way) => planWith(way));
    // Weighed in order below; a failure is met there.
    for (const t of tries) t.catch(() => undefined);
    for (const [i, t] of tries.entries()) {
      const next = await t;
      if (!latest()) return;
      if (better(next, best)) {
        [best, strategy] = [next, ways[i]];
        keep(best);
      }
      if (!worthImproving(best.plan)) break;
    }
  }
  weighed();
  if (!best.plan.deaths?.length) return;
  const repaired = await planWith(strategy, true);
  if (latest() && better(repaired, best)) keep(repaired);
}

// Whether the plain plan `first` is looked at further (`refinePlans`).
export const refines = (first: Plan) => worthImproving(first) || !!first.deaths?.length;
