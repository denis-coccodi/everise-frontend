import { freedForHard, hardFirst, inPlanningOrder, withTheirGrants } from './hard-first';
import type { Mechanic, MitigationTool, Plan, PlannedUse } from './plan.model';

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

describe('freedForHard', () => {
  // Player 1's 120s cooldown, lasting 15s, on the party or only themselves; used at 10s.
  const tool = (target: 'party' | 'self', charges = 1) =>
    ({
      player: 1,
      action: 7,
      charges,
      recastMs: 120_000,
      castMs: 0,
      effects: [{ target, durationMs: 15_000 }],
    }) as unknown as MitigationTool;
  const use = { player: 1, action: 7, at: 10_000, target: null, covers: [] } as PlannedUse;
  const hit = (id: number, at: number, players = [1, 2]) =>
    ({ id, at, hits: players.map((player) => ({ player })) }) as unknown as Mechanic;
  const freed = (t: MitigationTool, m: Mechanic, u: PlannedUse = use, hard = new Set([m.id])) =>
    freedForHard([t], [m], hard)(u);

  it('lets a use go where its recast keeps it from a hard mechanic it could cover', () => {
    expect(freed(tool('party'), hit(1, 60_000))).toBe(true);
    expect(freed(tool('self'), hit(1, 60_000))).toBe(true);
  });

  it("keeps it where it covers the hard mechanic, is back by then, can't reach it, or nothing is hard", () => {
    expect(freed(tool('party'), hit(1, 20_000))).toBe(false);
    expect(freed(tool('party'), hit(1, 140_000))).toBe(false);
    expect(freed(tool('self'), hit(1, 60_000, [2, 3]))).toBe(false);
    expect(freed(tool('party'), hit(1, 60_000), use, new Set())).toBe(false);
  });

  it('keeps played uses, and those of a tool with charges', () => {
    expect(freed(tool('party'), hit(1, 60_000), { ...use, played: true })).toBe(false);
    expect(freed(tool('party', 2), hit(1, 60_000))).toBe(false);
  });
});

describe('withTheirGrants', () => {
  // Player 1's Neutral Sect (16559) and the Sun Sign (37031) it grants for 30s.
  const tools = [
    { player: 1, action: 16559 },
    { player: 1, action: 37031, grantedBy: { action: 16559, withinMs: 30_000, uses: 1 } },
  ] as unknown as MitigationTool[];
  const use = (action: number, at: number) => ({ player: 1, action, at, target: null, covers: [] }) as PlannedUse;

  it('keeps a granted use with what granted it', () => {
    const kept = [use(16559, 10_000), use(37031, 12_000)];
    expect(withTheirGrants(tools, kept)).toEqual(kept);
  });

  it('lets it go with what granted it, freed', () => {
    expect(withTheirGrants(tools, [use(37031, 12_000), use(16559, 50_000)])).toEqual([use(16559, 50_000)]);
  });
});
