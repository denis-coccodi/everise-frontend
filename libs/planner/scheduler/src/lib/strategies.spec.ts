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
});
