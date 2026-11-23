import type { Plan, PlannedUse } from '@everise/planner/scheduler';
import { planLegality } from './plan-legality';
import { actionCatalog, pullTimeline } from './planner-fixtures';

const use = (
  player: number,
  action: number,
  name: string,
  at: number,
  extra: Partial<PlannedUse> = {},
): PlannedUse => ({
  player,
  action,
  name,
  at,
  target: null,
  covers: [],
  ...extra,
});
const planOf = (uses: PlannedUse[], replanned?: number[]): Plan => ({
  mechanics: [],
  uses,
  hits: [],
  unplaced: [],
  hp: [],
  ...(replanned ? { replanned } : {}),
});

describe('planLegality', () => {
  it('finds a cast of the plan whose cooldown is not back', () => {
    // Rampart: 60s, one charge.
    const plan = planOf([use(1, 7531, 'Rampart', 100_000), use(1, 7531, 'Rampart', 130_000)]);
    const result = planLegality(plan, pullTimeline(), actionCatalog());
    expect(result.plan).toContainEqual({
      action: 7531,
      at: 130_000,
      source: 'plan',
      player: 1,
      rule: 'recast',
      needs: "Rampart's recast",
    });
    expect(result.plan.some((c) => c.at === 100_000)).toBe(false);
  });

  it('judges the log by the same rules, and only the replanned players', () => {
    const plan = planOf([use(1, 7531, 'Rampart', 100_000), use(1, 7531, 'Rampart', 130_000)], [2]);
    const result = planLegality(plan, pullTimeline(), actionCatalog());
    expect(result.plan).toEqual([]);
    expect(result.log).toEqual([]);
  });

  it('leaves out a second press, which spends no cooldown (Horoscope read)', () => {
    const plan = planOf([use(1, 7531, 'Rampart', 100_000), use(1, 7531, 'Rampart', 105_000, { again: 'horoscope' })]);
    expect(planLegality(plan, pullTimeline(), actionCatalog()).plan).toEqual([]);
  });
});
