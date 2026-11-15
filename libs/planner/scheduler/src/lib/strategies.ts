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

// The best of the plans `planWith` makes with each strategy (`better`).
// The others are only tried while players die to a mechanic's hit, or (only
// `FOR_SHORT_HITS`) while a hit is left short: they change where the
// cooldowns go, which deaths to a damage-over-time tick or an auto-attack
// don't turn on (heals cover those), and each costs a whole plan's time.
export function bestOfStrategies(planWith: (strategy: Strategy) => Plan, better: (a: Plan, b: Plan) => boolean): Plan {
  const dies = (p: Plan) => !!p.deaths?.some((d) => d.mechanic !== null);
  const short = (p: Plan) => p.hits.some((h) => !h.safe && !h.avoidable);
  let best = planWith(STRATEGIES[0]);
  for (const strategy of dies(best) ? STRATEGIES.slice(1) : FOR_SHORT_HITS) {
    if (!dies(best) && !short(best)) break;
    const next = planWith(strategy);
    if (better(next, best)) best = next;
  }
  return best;
}
