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

// The plan with each hit's HP the lowest any round so far landed it on
// (`lowest`, kept up to date): the next round's mitigations plan for that,
// not for HP that heals planned again may not give it.
export function atLowestHp(plan: Plan, lowest: Map<string, number>): Plan {
  const hits = plan.hits.map((h) => {
    if (h.hpBefore === null) return h;
    const key = `${h.mechanic}:${h.player}`;
    const hp = Math.min(lowest.get(key) ?? Infinity, h.hpBefore);
    lowest.set(key, hp);
    return { ...h, hpBefore: hp };
  });
  return { ...plan, hits };
}
