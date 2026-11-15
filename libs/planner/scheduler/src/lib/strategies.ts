import type { Plan, PlanOptions } from './plan.model';
import { better } from './plan-score';
import type { Strategy } from './strategy.model';

// The ways a pull is planned: the plain one, then the others where it still
// lets players die.
export const STRATEGIES: Strategy[] = [
  {},
  { partyWaits: true },
  { healsFirstNeed: true },
  { tankChains: true },
  { healersHeal: true },
  { macrocosmos: true },
];

// Whether plan `a` is better than `b`: fewer deaths, then `better`.
export function betterPlan(a: Plan, b: Plan, maxHp: Map<number, number>, options: PlanOptions) {
  const [x, y] = [a.deaths?.length ?? 0, b.deaths?.length ?? 0];
  return x < y || (x === y && better(a, b, maxHp, options));
}

// Where nobody dies to a mechanic but hits are left short, the strategies
// that have mended those on the bench (the party's cooldowns waiting, the
// healers healing first): the others only moved deaths around.
const FOR_SHORT_HITS: Strategy[] = [{ partyWaits: true }, { healersHeal: true }];

// Whether a player dies to a mechanic's hit in the plan.
export const diesToMechanic = (p: Plan) => !!p.deaths?.some((d) => d.mechanic !== null);

// Whether another strategy could still make the plan better: players die
// to a mechanic's hit, or a hit is left short. The strategies change where
// the cooldowns go, which deaths to a damage-over-time tick or an
// auto-attack don't turn on (heals cover those), and each costs a whole
// plan's time.
export const worthImproving = (p: Plan) => diesToMechanic(p) || p.hits.some((h) => !h.safe && !h.avoidable);

// The strategies tried after the plain plan `first`, in order, while the
// best plan is `worthImproving`: every other while players die to a
// mechanic, else those that mend short hits.
export const strategiesAfter = (first: Plan) => (diesToMechanic(first) ? STRATEGIES.slice(1) : FOR_SHORT_HITS);

// The best of the plans `planWith` makes with each strategy (`better`).
// The page makes them side by side instead (`refinePlans`), by the same rules.
export function bestOfStrategies(planWith: (strategy: Strategy) => Plan, better: (a: Plan, b: Plan) => boolean): Plan {
  let best = planWith(STRATEGIES[0]);
  for (const strategy of strategiesAfter(best)) {
    if (!worthImproving(best)) break;
    const next = planWith(strategy);
    if (better(next, best)) best = next;
  }
  return best;
}
