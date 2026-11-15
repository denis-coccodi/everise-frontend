import type { Plan } from './plan.model';
import { STRATEGIES, bestOfStrategies } from './strategies';
import type { Strategy } from './strategy.model';

// A plan with this many deaths (and a tag saying which strategy made it).
const plan = (deaths: number, tag: string): Plan =>
  ({
    mechanics: [],
    uses: [],
    hits: [],
    unplaced: [],
    hp: [],
    deaths: Array.from({ length: deaths }, () => ({}) as never),
    scheduled: [tag],
  }) as Plan;
// Fewer deaths is better, as `betterPlan` has it first.
const fewer = (a: Plan, b: Plan) => (a.deaths?.length ?? 0) < (b.deaths?.length ?? 0);

describe('bestOfStrategies', () => {
  it('keeps the plain plan, trying nothing else, when nobody dies', () => {
    const tried: Strategy[] = [];
    const best = bestOfStrategies((s) => (tried.push(s), plan(0, 'plain')), fewer);

    expect(tried).toEqual([STRATEGIES[0]]);
    expect(best.scheduled).toEqual(['plain']);
  });

  it('tries the others while players die, and keeps the one with fewest deaths', () => {
    const deaths = [3, 2, 0, 1];
    const tried: Strategy[] = [];
    const best = bestOfStrategies((s) => {
      tried.push(s);
      return plan(deaths[tried.length - 1], `#${tried.length - 1}`);
    }, fewer);

    // The third had none: nothing after it is tried.
    expect(tried).toEqual(STRATEGIES.slice(0, 3));
    expect(best.scheduled).toEqual(['#2']);
  });

  it('tries the party waiting, then the healers healing, while a hit is left short, though nobody dies', () => {
    const short = { ...plan(0, 'plain'), hits: [{ safe: false, avoidable: false } as never] };
    const tried: Strategy[] = [];
    bestOfStrategies(
      (s) => (tried.push(s), short),
      () => false,
    );

    expect(tried).toEqual([STRATEGIES[0], { partyWaits: true }, { healersHeal: true }]);
  });

  it('stops at the first plan that leaves no hit short', () => {
    // The plain plan leaves a hit short, the next none: it's kept.
    const short = { ...plan(0, 'plain'), hits: [{ safe: false, avoidable: false } as never] };
    const tried: Strategy[] = [];
    const leftShort = (p: Plan) => p.hits.filter((h) => !h.safe).length;
    const best = bestOfStrategies(
      (s) => (tried.push(s), tried.length === 1 ? short : plan(0, 'next')),
      (a, b) => leftShort(a) < leftShort(b),
    );

    expect(tried).toEqual(STRATEGIES.slice(0, 2));
    expect(best.scheduled).toEqual(['next']);
  });
});
