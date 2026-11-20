import { deadIn } from './plan-score';
import type { Plan, PlanOptions } from './plan.model';

// The other ways a plan made as `asked` is tried, in order, where it leaves
// a hit short or someone dead (`planVariants`): only the heavy raidwides get
// shields, then everything refills everywhere, then no shields go up just
// for the raidwides, then neither. None for a plan made one of those ways
// already, or asked for alone (`oneWay`).
export function variantsOf(asked: PlanOptions): PlanOptions[] {
  if (asked.oneWay || asked.refillEverywhere || asked.noRaidwideShields) return [];
  return [
    { ...asked, noRaidwideShields: 'light' },
    { ...asked, refillEverywhere: true },
    { ...asked, noRaidwideShields: true },
    { ...asked, refillEverywhere: true, noRaidwideShields: true },
  ];
}

// Whether the next way is worth trying after `plan`: a hit short or someone dead.
export const triesNext = (plan: Plan) => !!plan.deaths?.length || plan.hits.some((h) => !h.safe && !h.avoidable);

// Whether `next` is kept over `plan`: fewer players dying (to any damage: a
// damage-over-time tick too), else as many and `better`. Where it isn't, no
// further way is tried.
export function keepsNext(next: Plan, plan: Plan, better: (a: Plan, b: Plan) => boolean) {
  const [now, was] = [deadIn(next), deadIn(plan)];
  return now < was || (now === was && better(next, plan));
}

// A plan made one way (`asked`), by `planOnce`, in passes (`begin` hears how
// many there can be). GCD heals refill to full only before the heavy
// mechanics and the raidwides, as the logs' healers do, and shield everyone
// for every raidwide; where a hit is left short or someone dead, the other
// ways (`variantsOf`), each kept while it's better, stopping at the first
// that isn't (on the bench's 18 slowest kills, the same plans in 23% less
// time). The page makes the ways side by side instead, by the same rules.
export function planVariants(
  asked: PlanOptions,
  planOnce: (options: PlanOptions) => Plan,
  better: (a: Plan, b: Plan) => boolean,
  begin: (passes: number) => void,
): Plan {
  const variants = variantsOf(asked);
  begin(1 + variants.length);
  let plan = planOnce(asked);
  for (const variant of variants) {
    if (!triesNext(plan)) break;
    const next = planOnce(variant);
    if (!keepsNext(next, plan, better)) break;
    plan = next;
  }
  return plan;
}
