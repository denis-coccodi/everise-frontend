import { mpWithDeaths } from './death-mp';
import type { PlannedMp } from './mp.model';
import type { PlannedDeath } from './plan-deaths.model';

describe('mpWithDeaths', () => {
  // A healer (1, 10,000 MP) whose planned MP goes 8,000 at 10s, 6,000 at 20s, 7,000 at 40s, 9,000 at 60s.
  const mp: PlannedMp[] = [
    {
      player: 1,
      points: [
        { at: 10_000, mp: 8_000 },
        { at: 20_000, mp: 6_000 },
        { at: 40_000, mp: 7_000 },
        { at: 60_000, mp: 9_000 },
      ],
      dropped: [],
      gained: [],
    },
  ];
  const maxMp = new Map([[1, 10_000]]);
  const death = (rest: Partial<PlannedDeath>): PlannedDeath => ({
    player: 1,
    at: 15_000,
    mechanic: null,
    raisedBy: 2,
    raisedAt: 30_000,
    backAt: 35_000,
    ...rest,
  });
  const points = (deaths: PlannedDeath[]) => mpWithDeaths(mp, [], deaths, maxMp).mp?.[0].points;

  it('has none from a death, back at 20% when raised, the plan going on from there', () => {
    // At 35s the plan had 6,000: back at 2,000, so 4,000 under it after.
    expect(points([death({})])).toEqual([
      { at: 10_000, mp: 8_000 },
      { at: 15_000, mp: 0 },
      { at: 35_000, mp: 2_000 },
      { at: 40_000, mp: 3_000 },
      { at: 60_000, mp: 5_000 },
    ]);
  });

  it('is back full after Pulse of Life, and stays at none where nobody raises them', () => {
    expect(points([death({ full: true })])?.slice(2)).toEqual([
      { at: 35_000, mp: 10_000 },
      { at: 40_000, mp: 10_000 },
      { at: 60_000, mp: 10_000 },
    ]);
    expect(points([death({ raisedBy: null, raisedAt: null, backAt: null })])).toEqual([
      { at: 10_000, mp: 8_000 },
      { at: 15_000, mp: 0 },
    ]);
  });

  it('drops an MP shortfall while they are dead', () => {
    const short = [
      { player: 1, at: 20_000 },
      { player: 1, at: 50_000 },
    ];
    expect(mpWithDeaths(mp, short, [death({})], maxMp).mpShort).toEqual([{ player: 1, at: 50_000 }]);
  });
});
