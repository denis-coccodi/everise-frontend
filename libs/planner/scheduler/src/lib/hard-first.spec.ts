import { hardFirst, inPlanningOrder } from './hard-first';
import type { Mechanic, Plan } from './plan.model';

// A plan whose hits at these mechanics are short (and with `dead` players dying).
const planOf = (short: number[], dead = 0) =>
  ({
    hits: short.map((mechanic) => ({ mechanic, safe: false, avoidable: false })),
    hp: Array.from({ length: dead }, () => ({ points: [{ at: 0, hp: 0 }] })),
  }) as unknown as Plan;

const fewerShort = (a: Plan, b: Plan) => a.hits.length < b.hits.length;

describe('inPlanningOrder', () => {
  const mechanics = [1, 2, 3, 4].map((id) => ({ id, at: id * 1000 }) as Mechanic);

  it('keeps time order with none first', () => {
    expect(inPlanningOrder(mechanics, new Set()).map((m) => m.id)).toEqual([1, 2, 3, 4]);
  });

  it('puts the ones first before the rest, each in time order', () => {
    expect(inPlanningOrder(mechanics, new Set([4, 2])).map((m) => m.id)).toEqual([2, 4, 1, 3]);
  });
});

describe('hardFirst', () => {
  it('plans nothing again where no hit is short', () => {
    let tries = 0;
    const plan = planOf([]);
    expect(hardFirst(plan, () => (tries++, plan), fewerShort)).toEqual({ plan, first: new Set() });
    expect(tries).toBe(0);
  });

  it('plans the short mechanics first, then those it leaves short too, while better', () => {
    const tried: number[][] = [];
    const results = [planOf([7]), planOf([])];
    const { plan, first } = hardFirst(
      planOf([5, 5]),
      (set) => (tried.push([...set]), results[tried.length - 1]),
      fewerShort,
    );
    expect(tried).toEqual([[5], [5, 7]]);
    expect(plan).toBe(results[1]);
    expect(first).toEqual(new Set([5, 7]));
  });

  it('keeps the plan as it was where healing them first is no better', () => {
    const plan = planOf([5]);
    expect(hardFirst(plan, () => planOf([6]), fewerShort)).toEqual({ plan, first: new Set() });
  });

  it('keeps the plan as it was where more players die', () => {
    const plan = planOf([5, 6]);
    expect(hardFirst(plan, () => planOf([], 1), fewerShort)).toEqual({ plan, first: new Set() });
  });
});
