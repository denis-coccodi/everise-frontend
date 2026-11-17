import { planVariants } from './plan-variants';
import type { Plan, PlanOptions } from './plan.model';

// A plan this many hits short, named after the options it was made with.
const planOf = (short: number, made: PlanOptions) =>
  ({
    made,
    deaths: [],
    hits: Array.from({ length: short }, () => ({ safe: false, avoidable: false })),
  }) as unknown as Plan & { made: PlanOptions };

const kind = (o: PlanOptions) =>
  (o.noRaidwideShields === 'light' ? 'L' : '') +
    (o.refillEverywhere ? 'R' : '') +
    (o.noRaidwideShields === true ? 'N' : '') || 'plain';

function plan(shortBy: Record<string, number>) {
  const tried: string[] = [];
  const made = planVariants(
    { margin: 0.1 },
    (o) => {
      tried.push(kind(o));
      return planOf(shortBy[kind(o)], o);
    },
    (a, b) => a.hits.length < b.hits.length,
    () => undefined,
  ) as Plan & { made: PlanOptions };
  return { tried, kept: kind(made.made) };
}

describe('planVariants', () => {
  it('makes only the plain plan where nothing is short', () => {
    expect(plan({ plain: 0 })).toEqual({ tried: ['plain'], kept: 'plain' });
  });

  it('tries the next way while each one is better, the best kept', () => {
    expect(plan({ plain: 4, L: 3, R: 2, N: 1, RN: 0 })).toEqual({ tried: ['plain', 'L', 'R', 'N', 'RN'], kept: 'RN' });
  });

  it('stops at the first way that is no better', () => {
    expect(plan({ plain: 4, L: 3, R: 2, N: 2, RN: 0 })).toEqual({ tried: ['plain', 'L', 'R', 'N'], kept: 'R' });
    expect(plan({ plain: 3, L: 4, R: 0, N: 0, RN: 0 })).toEqual({ tried: ['plain', 'L'], kept: 'plain' });
    expect(plan({ plain: 3, L: 2, R: 4, N: 0, RN: 0 })).toEqual({ tried: ['plain', 'L', 'R'], kept: 'L' });
  });
});
