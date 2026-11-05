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
  const planned = () => {
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
    return new PlannerScheduler().plan(timeline, cat, { margin: 0.1 });
  };

  it('stays where the group used it when everyone is replanned, and saves the hits it covers', () => {
    const p = planned();

    expect(p.uses.filter((u) => u.name === 'Last Bastion').map((u) => [u.player, u.at])).toEqual([[1, 25_300]]);
    const first = p.hits.filter((h) => h.mechanic === p.mechanics[0].id);
    expect(first.every((h) => h.covers.includes('Last Bastion') && h.planned <= 80_000)).toBe(true);
  });

  it('is never planned where the group had none', () => {
    const p = planned();
    const second = p.hits.filter((h) => h.mechanic === p.mechanics[1].id);

    expect(second.some((h) => h.covers.includes('Last Bastion'))).toBe(false);
  });
});
