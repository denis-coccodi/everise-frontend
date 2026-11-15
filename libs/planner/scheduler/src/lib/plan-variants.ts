import type { Plan, PlanOptions } from './plan.model';

// A plan made one way (`asked`), by `planOnce`, in passes (`begin` hears how
// many there can be). GCD heals refill to full only before the heavy
// mechanics, as the logs' healers do, and shield everyone for the heavy
// raidwides; where a hit is left short or someone dead, everything refills
// everywhere, then no shields go up just for the raidwides, then neither:
// the `better` plan kept.
export function planVariants(
  asked: PlanOptions,
  planOnce: (options: PlanOptions) => Plan,
  better: (a: Plan, b: Plan) => boolean,
  begin: (passes: number) => void,
): Plan {
  const short = (p: Plan) => p.deaths?.length || p.hits.some((h) => !h.safe && !h.avoidable);
  const variants: PlanOptions[] = [
    { ...asked, refillEverywhere: true },
    { ...asked, noRaidwideShields: true },
    { ...asked, refillEverywhere: true, noRaidwideShields: true },
  ];
  begin(1 + variants.length);
  let plan = planOnce(asked);
  if (asked.refillEverywhere || asked.noRaidwideShields) return plan;
  for (const variant of variants) {
    if (!short(plan)) break;
    const next = planOnce(variant);
    if (better(next, plan)) plan = next;
  }
  return plan;
}
