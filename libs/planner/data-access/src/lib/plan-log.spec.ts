import type { Plan } from '@everise/planner/scheduler';
import { actionCatalog, pullTimeline } from './planner-fixtures';
import { planLog, unsafeHits } from './plan-log';

const plan: Plan = {
  mechanics: [
    { id: 0, at: 65_000, action: 45956, name: 'Killer Voice', kind: 'raidwide', damageType: 'magic', hits: [] },
    { id: 1, at: 200_000, action: 45956, name: 'Killer Voice', kind: 'raidwide', damageType: 'magic', hits: [] },
  ],
  uses: [
    { player: 1, action: 7535, name: 'Reprisal', at: 64_500, target: null, covers: [0] },
    { player: 1, action: 7382, name: 'Intervention', at: 199_500, target: 2, covers: [1] },
  ],
  hits: [
    {
      mechanic: 0,
      player: 2,
      unmitigated: 100_000,
      planned: 90_000,
      asPlayed: 40_000,
      absorbed: 0,
      hpBefore: 180_000,
      share: 0.45,
      safe: true,
      invulnerable: false,
      avoidable: false,
      covers: ['Reprisal'],
    },
    {
      mechanic: 1,
      player: 2,
      unmitigated: 210_000,
      planned: 189_000,
      asPlayed: 210_000,
      absorbed: 5_000,
      hpBefore: 200_000,
      share: 0.945,
      safe: false,
      invulnerable: false,
      avoidable: false,
      covers: ['Intervention'],
    },
  ],
  unplaced: [],
};

describe('planLog', () => {
  it("gives a player's hits as the plan leaves them, and their HP before and after", () => {
    expect(planLog(plan, pullTimeline(), 2)).toEqual([
      {
        kind: 'hit',
        at: 65_000,
        action: 'Killer Voice',
        unmitigated: 100_000,
        planned: 90_000,
        asPlayed: 40_000,
        absorbed: 0,
        share: 0.45,
        before: 0.9,
        after: 0.45,
        safe: true,
        avoidable: false,
        covers: ['Reprisal'],
      },
      expect.objectContaining({ kind: 'hit', at: 200_000, safe: false }),
    ]);
  });

  it('shows the damage GCD of theirs a planned oGCD is woven after', () => {
    // Their Fast Blade at 62s, as played, before the Reprisal at 64.5s.
    const catalog = actionCatalog();
    for (const a of catalog.actions) if (a.id === 9) a.gcd = true;

    expect(planLog(plan, pullTimeline(), 1, catalog).slice(0, 2)).toEqual([
      { kind: 'gcd', at: 62_000 },
      expect.objectContaining({ kind: 'use', action: 'Reprisal' }),
    ]);
  });

  it('gives what the plan has a player use, and who for, before the hits it covers', () => {
    expect(planLog(plan, pullTimeline(), 1)).toEqual([
      { kind: 'use', at: 64_500, action: 'Reprisal', target: null, covers: ['Killer Voice'], damage: false },
      {
        kind: 'use',
        at: 199_500,
        action: 'Intervention',
        target: 'Heal Main',
        covers: ['Killer Voice'],
        damage: false,
      },
    ]);
  });
});

describe('unsafeHits', () => {
  it("counts the hits short of the margin, the party's or one player's", () => {
    expect(unsafeHits(plan)).toBe(1);
    expect(unsafeHits(plan, 1)).toBe(0);
  });
});
