import { Plan, PlanOptions } from './plan.model';

// Fewer hits short of the margin, or as many but short by less.
export function better(a: Plan, b: Plan, maxHp: Map<number, number>, options: PlanOptions) {
  const score = (plan: Plan) => {
    const short = plan.hits.filter((h) => !h.safe);
    const by = short.reduce((sum, h) => {
      const margin = options.margin * (maxHp.get(h.player) ?? 0);
      return sum + Math.max(0, margin - ((h.hpBefore ?? 0) - h.planned));
    }, 0);
    return { count: short.length, by };
  };
  const [x, y] = [score(a), score(b)];
  return x.count < y.count || (x.count === y.count && x.by < y.by);
}
