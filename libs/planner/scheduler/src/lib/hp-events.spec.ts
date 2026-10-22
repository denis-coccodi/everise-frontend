import { TimelineHeal } from '@everise/core/api-types';
import { healEvents, pullEvents } from './hp-events';
import { HealTool, Mechanic, PlannedHit } from './plan.model';
import { pull } from './scheduler-fixtures';

describe('pullEvents', () => {
  const lustrate: HealTool = {
    player: 2,
    action: 189,
    name: 'Lustrate',
    recastMs: 1000,
    charges: 1,
    gcd: false,
    castMs: 0,
    group: '2:189',
    pool: null,
    effects: [{ target: 'target', size: { hp: 60_000 }, ticks: 1, status: null, statusId: null }],
  };
  const dawn: HealTool = {
    ...lustrate,
    action: 16537,
    name: 'Whispering Dawn',
    effects: [{ target: 'party', size: { hp: 8000 }, ticks: 7, status: 'Whispering Dawn', statusId: 315 }],
  };

  it('takes the planned damage of mechanics, every other hit as played, and the heals the plan has no part in', () => {
    const timeline = pull([
      [30, 'Raidwide', 1, 80_000],
      [30.4, 'Raidwide', 3, 80_000],
      [40, 'Attack', 1, 5000],
    ]);
    const healed = (extra: Partial<TimelineHeal>): TimelineHeal => ({
      ...timeline.heals[0],
      at: 50_000,
      source: 2,
      pet: null,
      target: 1,
      action: null,
      status: null,
      amount: 1000,
      overheal: 500,
      tick: false,
      estimated: false,
      hp: null,
      ...extra,
    });
    timeline.actions.push({ id: 16538, name: 'Whispering Dawn' }, { id: 7, name: 'Embrace' });
    timeline.statuses.push({ id: 315, name: 'Whispering Dawn' });
    timeline.heals = [
      healed({ action: 189 }),
      // Eos casts the scholar's Whispering Dawn under its own id.
      healed({ action: 16538, pet: 'Eos' }),
      healed({ status: 315, tick: true }),
      healed({ action: 7, pet: 'Eos' }),
      healed({ source: null, action: 4 }),
    ];
    const mechanic: Mechanic = {
      id: 0,
      at: 30_000,
      action: 100,
      name: 'Raidwide',
      kind: 'raidwide',
      damageType: 'magic',
      hits: [],
    };
    const hit = (player: number, planned: number) => ({ mechanic: 0, player, planned }) as PlannedHit;

    expect(pullEvents(timeline, [mechanic], [hit(1, 70_000), hit(3, 72_000)], [lustrate, dawn])).toEqual([
      { at: 30_000, player: 1, amount: -70_000 },
      { at: 30_000, player: 3, amount: -72_000 },
      { at: 40_000, player: 1, amount: -5000 },
      { at: 50_000, player: 1, amount: 1500 },
    ]);
  });

  it('heals as a heal lands, and over time every 3 seconds after', () => {
    const use = { player: 2, action: 16537, name: 'Whispering Dawn', at: 10_000, target: null, covers: [] };
    const events = healEvents(dawn, use, [1, 2], new Map());

    expect(events).toHaveLength(14);
    expect(events.slice(0, 2)).toEqual([
      { at: 13_000, player: 1, amount: 8000 },
      { at: 16_000, player: 1, amount: 8000 },
    ]);
    expect(healEvents(lustrate, { ...use, action: 189, target: 3 }, [1, 2, 3], new Map())).toEqual([
      { at: 10_000, player: 3, amount: 60_000 },
    ]);
  });
});
