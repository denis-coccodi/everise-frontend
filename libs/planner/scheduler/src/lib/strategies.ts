import type { Plan, PlanOptions } from './plan.model';
import { better } from './plan-score';
import type { Strategy } from './strategy.model';

// The ways a pull is planned: the plain one, then the others where it still
// lets players die.
export const STRATEGIES: Strategy[] = [{}, { partyWaits: true }, { healsFirstNeed: true }, { tankChains: true }];

// Whether plan `a` is better than `b`: fewer deaths, then `better`.
export function betterPlan(a: Plan, b: Plan, maxHp: Map<number, number>, options: PlanOptions) {
  const [x, y] = [a.deaths?.length ?? 0, b.deaths?.length ?? 0];
  return x < y || (x === y && better(a, b, maxHp, options));
}

// The best of the plans `planWith` makes with each strategy (`better`).
// The others are only tried while players die.
export function bestOfStrategies(planWith: (strategy: Strategy) => Plan, better: (a: Plan, b: Plan) => boolean): Plan {
  let best = planWith(STRATEGIES[0]);
  for (const strategy of STRATEGIES.slice(1)) {
    if (!best.deaths?.length) break;
    const next = planWith(strategy);
    if (better(next, best)) best = next;
  }
  return best;
}
