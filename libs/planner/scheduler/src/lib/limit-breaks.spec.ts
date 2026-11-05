import { PlannerScheduler } from './planner-scheduler.service';
import { action, catalog, heal, pull } from './scheduler-fixtures';

// The paladin's Last Bastion: the party takes 80% less for 8s.
const lastBastion = action(
  199,
  'Last Bastion',
  ['PLD'],
  0,
  [
    {
      ...heal(0),
      kind: 'mitigation',
      target: 'party',
      status: 'Last Bastion',
      potency: null,
      percent: 80,
      durationMs: 8_000,
    },
  ],
  { level: 0, limitBreak: true },
);

describe('a tank Limit Break', () => {
  // Two raidwides of four times anyone's HP: the group used Last Bastion for
  // the first only.
  // The gauge: three full bars from 150s (`full`), else two.
  const planned = (laterLimitBreak?: { at: number; action: number }, full = true) => {
    const cat = catalog();
    cat.actions.push(lastBastion);
    const timeline = pull([
      [30, 'Raidwide', 1, 400_000],
      [30, 'Raidwide', 2, 400_000],
      [30, 'Raidwide', 3, 400_000],
      [200, 'Raidwide', 1, 400_000],
      [200, 'Raidwide', 2, 400_000],
      [200, 'Raidwide', 3, 400_000],
    ]);
    timeline.playerCasts.push({ at: 24_000, source: 1, target: null, action: 199, castMs: null });
    if (laterLimitBreak) timeline.playerCasts.push({ ...laterLimitBreak, source: 3, target: null, castMs: null });
    timeline.limitBreakGauge = [{ at: 150_000, value: full ? 30_000 : 20_000, bars: 3 }];
    return new PlannerScheduler().plan(timeline, cat, { margin: 0.1 });
  };
  const second = (p: ReturnType<typeof planned>) => p.hits.filter((h) => h.mechanic === p.mechanics[1].id);

  it('stays where the group used it when everyone is replanned, and saves the hits it covers', () => {
    const p = planned(undefined, false);

    expect(p.uses.filter((u) => u.name === 'Last Bastion').map((u) => [u.player, u.at])).toEqual([[1, 25_300]]);
    const first = p.hits.filter((h) => h.mechanic === p.mechanics[0].id);
    expect(first.every((h) => h.covers.includes('Last Bastion') && h.planned <= 80_000)).toBe(true);
  });

  it('is never planned without three bars, or on the gauge of a tank Limit Break the group used', () => {
    for (const p of [
      planned({ at: 230_000, action: 4244 }, false),
      // Their next one, Land Waker's (a tank's), stays.
      planned({ at: 230_000, action: 4240 }),
    ]) {
      expect(second(p).some((h) => h.covers.includes('Last Bastion'))).toBe(false);
      expect(p.uses.some((u) => u.gauge)).toBe(false);
    }
  });

  it('is planned where nothing else saves anyone, on three bars the group had', () => {
    // In place of the bard's Sagittarius Arrow at 230s; or on gauge they never spent.
    const p = planned({ at: 230_000, action: 4244 });

    expect(p.uses.filter((u) => u.gauge).map((u) => [u.player, u.name, u.at, u.gauge])).toEqual([
      [1, 'Last Bastion', 199_500, { replaces: { action: 4244, at: 230_000 } }],
    ]);
    expect(second(p).every((h) => h.covers.includes('Last Bastion') && h.planned < 100_000)).toBe(true);
    expect(p.deaths ?? []).toEqual([]);
    expect(
      planned()
        .uses.filter((u) => u.gauge)
        .map((u) => u.gauge),
    ).toEqual([{ replaces: null }]);
  });
});
