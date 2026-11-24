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

  it("finds a cast of an action the pull's level doesn't have", () => {
    // Rampart learnt at 96 here; the party at 90.
    const catalog = actionCatalog();
    catalog.actions = catalog.actions.map((a) => (a.id === 7531 ? { ...a, level: 96 } : a));
    const timeline = pullTimeline();
    const stats = { level: 90, strength: 0, dexterity: 0, vitality: 0, intelligence: 0, mind: 0, piety: 0 };
    const more = { determination: 0, criticalHit: 0, directHit: 0, skillSpeed: 0, spellSpeed: 0, tenacity: 0 };
    timeline.players = timeline.players.map((p) => ({ ...p, stats: { ...stats, ...more } }));
    const result = planLegality(planOf([use(1, 7531, 'Rampart', 100_000)]), timeline, catalog);
    expect(result.plan).toEqual([
      { action: 7531, at: 100_000, source: 'plan', player: 1, rule: 'level', needs: 'level 96 (the pull is at 90)' },
    ]);
  });

  it('leaves out a second press, which spends no cooldown (Horoscope read)', () => {
    const plan = planOf([use(1, 7531, 'Rampart', 100_000), use(1, 7531, 'Rampart', 105_000, { again: 'horoscope' })]);
    expect(planLegality(plan, pullTimeline(), actionCatalog()).plan).toEqual([]);
  });
});
