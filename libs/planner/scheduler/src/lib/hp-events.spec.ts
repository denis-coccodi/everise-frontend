import { TimelineHeal } from '@everise/core/api-types';
import { healEvents, naturalRegen, pullEvents } from './hp-events';
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
    grantedBy: null,
    cost: 'free',
    effects: [{ target: 'target', size: { hp: 60_000 }, ticks: 1, status: null, statusId: null }],
    delayed: null,
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
      // Natural regeneration as played: recalculated, not kept.
      healed({ source: 1, action: 1302, amount: 600, overheal: 0 }),
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

  it("recalculates natural regeneration: 1% of max HP every 3s on each player's tick in the log", () => {
    const timeline = pull([[30, 'Raidwide', 1, 80_000]]);
    timeline.durationMs = 10_000;
    timeline.heals = [
      {
        ...timeline.heals[0],
        at: 4_200,
        source: 1,
        pet: null,
        target: 1,
        action: 1302,
        status: null,
        amount: 600,
        overheal: 0,
        tick: false,
        estimated: false,
        hp: null,
      },
    ];

    // The tank (100,000 HP) on their 1.2s tick; nobody else regenerated in the log.
    expect(naturalRegen(timeline)).toEqual([1_200, 4_200, 7_200].map((at) => ({ at, player: 1, amount: 1000 })));
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

  it("heals a delayed heal's delay later, and leaves out its heals as played", () => {
    const star: HealTool = {
      ...lustrate,
      action: 7439,
      name: 'Earthly Star',
      effects: [{ target: 'party', size: { hp: 72_000 }, ticks: 1, status: null, statusId: null }],
      delayed: {
        delaysMs: [20_000, 10_000],
        release: { action: 8324, name: 'Stellar Detonation' },
        belowShare: null,
        damageShare: null,
        stacks: null,
        loggedAs: 'Stellar Explosion',
      },
    };
    const use = { player: 2, action: 7439, name: 'Earthly Star', at: 10_000, target: null, covers: [] };
    // The star as played: its heal, which the log calls Stellar Explosion.
    const timeline = pull([], [[30, 2, 7441, 9000]]);
    timeline.actions.push({ id: 7441, name: 'Stellar Explosion' });

    expect(healEvents(star, use, [1], new Map(), 20_000)).toEqual([{ at: 30_000, player: 1, amount: 72_000 }]);
    expect(pullEvents(timeline, [], [], [star])).toEqual([]);
    expect(pullEvents(timeline, [], [], [lustrate])).toEqual([{ at: 30_000, player: 1, amount: 9000 }]);
  });
});
