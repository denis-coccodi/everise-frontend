import { keepsNext, triesNext, variantsOf } from '@everise/planner/scheduler';
import type { Plan, PlanOptions } from '@everise/planner/scheduler';

// A plan made as `asked`, as the planner makes it (`planVariants`), but its
// ways all asked for at once (`make`, each alone: `oneWay`), so a hard pull's
// plan doesn't wait for one way to end before the next starts: then weighed
// in order by the planner's own rules, and those no longer needed stopped
// (`make`'s signal aborts). The same plan, sooner, for more of the
// visitor's cores. `progress` hears how far they have got together (0 to 1).
export async function plannedSideBySide(
  asked: PlanOptions,
  make: (options: PlanOptions, progress: (share: number) => void, signal: AbortSignal) => Promise<Plan>,
  better: (a: Plan, b: Plan) => boolean,
  progress: (share: number) => void = () => undefined,
): Promise<Plan> {
  const ways = [asked, ...variantsOf(asked)].map((way) => ({ ...way, oneWay: true }));
  const shares = ways.map(() => 0);
  const hear = (i: number) => (share: number) => {
    shares[i] = share;
    progress(shares.reduce((a, b) => a + b, 0) / shares.length);
  };
  const stop = new AbortController();
  const made = ways.map((way, i) => make(way, hear(i), stop.signal));
  // Weighed in order below; a failure is met there, or not needed.
  for (const m of made) m.catch(() => undefined);
  try {
    let plan = await made[0];
    for (const next of made.slice(1)) {
      if (!triesNext(plan)) break;
      const tried = await next;
      if (!keepsNext(tried, plan, better)) break;
      plan = tried;
    }
    return plan;
  } finally {
    stop.abort();
  }
}
