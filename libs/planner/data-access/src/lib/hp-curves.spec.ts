import type { Plan } from '@everise/planner/scheduler';
import { hpCurves, lowest, shareAt } from './hp-curves';
import { pullTimeline } from './planner-fixtures';

describe('hpCurves', () => {
  // The healer's pull: 160,000 of 200,000 after Killer Voice at 65s, a 5,000
  // tick at 70s, a 20,000 heal at 100s, dead at 200s.
  function timeline() {
    const t = pullTimeline();
    t.damage[2].hp = null;
    t.heals = [
      {
        at: 100_000,
        source: 2,
        pet: null,
        target: 2,
        action: 189,
        status: null,
        amount: 20_000,
        overheal: 5_000,
        tick: false,
        estimated: false,
        hp: null,
      },
    ];
    return t;
  }
  const plan: Plan = {
    mechanics: [
      { id: 0, at: 65_000, action: 1, name: 'Killer Voice', kind: 'raidwide', damageType: 'magic', hits: [] },
      { id: 1, at: 200_000, action: 1, name: 'Wall', kind: 'raidwide', damageType: 'magic', hits: [] },
    ],
    uses: [],
    hits: [
      { ...hit(0), safe: true },
      { ...hit(1), planned: 189_000, safe: false },
    ],
    unplaced: [],
    hp: [
      {
        player: 2,
        points: [
          { at: 0, hp: 200_000 },
          { at: 65_000, hp: 150_000 },
        ],
      },
    ],
  };

  it('follows HP as played: the log after each hit, what each heal healed, 0 at a death', () => {
    const healer = hpCurves(timeline(), null).find((c) => c.name === 'Heal Main');

    expect(healer?.played).toEqual([
      { at: 0, share: 1 },
      { at: 65_000, share: 0.8 },
      { at: 70_000, share: 0.775 },
      { at: 100_000, share: 0.875 },
      { at: 200_000, share: 0 },
    ]);
    expect(healer?.planned).toBeNull();
    expect(healer?.marks).toEqual([{ at: 200_000, share: 0, kind: 'death', action: null }]);
  });

  it('adds the plan, and marks the hits it leaves short', () => {
    const healer = hpCurves(timeline(), plan).find((c) => c.name === 'Heal Main');

    expect(healer?.planned).toEqual([
      { at: 0, share: 1 },
      { at: 65_000, share: 0.75 },
    ]);
    expect(healer?.marks).toContainEqual({ at: 200_000, share: 0.055, kind: 'short', action: 'Wall' });
  });

  it('reads a curve at a moment, and its lowest point', () => {
    const points = [
      { at: 0, share: 1 },
      { at: 10_000, share: 0.4 },
      { at: 20_000, share: 0.9 },
    ];

    expect([shareAt(points, 5_000), shareAt(points, 10_000), shareAt(points, 25_000)]).toEqual([1, 0.4, 0.9]);
    expect(lowest(points)).toEqual({ at: 10_000, share: 0.4 });
  });
});

function hit(mechanic: number) {
  return {
    mechanic,
    player: 2,
    unmitigated: 200_000,
    planned: 50_000,
    asPlayed: 40_000,
    absorbed: 0,
    hpBefore: 200_000,
    share: 0.25,
    safe: true,
    invulnerable: false,
    avoidable: false,
    covers: [],
  };
}
