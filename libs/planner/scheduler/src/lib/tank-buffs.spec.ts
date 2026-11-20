import type { TimelinePlayer } from '@everise/core/api-types';
import type { HealTool, Mechanic } from './plan.model';
import { tankBuffs } from './tank-buffs';
import { Weaving } from './weaving';
import type { Spent } from './heal-plan.model';

describe('tankBuffs', () => {
  const tool = (action: number, name: string, recastMs: number, pool: HealTool['pool'] = null) =>
    ({
      player: 3,
      action,
      name,
      recastMs,
      charges: 1,
      gcd: false,
      castMs: 0,
      group: `3:${name}`,
      pool,
      cost: 'free',
      effects: [],
    }) as unknown as HealTool;
  // The Arrow, one card a draw: at the pull and 110s on.
  const arrow = tool(37024, 'the Arrow', 1_000, { name: 'the Arrow', gainMs: 110_000, max: 1, refills: [0, 110_000] });
  const protraction = tool(25867, 'Protraction', 60_000);
  const players = [
    { id: 1, role: 'tank', maxHp: 30_000 },
    { id: 2, role: 'tank', maxHp: 30_000 },
    { id: 3, role: 'healer' },
  ] as TimelinePlayer[];
  // A hit on each of `hits` ([player, damage]) at `s` seconds.
  const mechanic = (id: number, s: number, hits: [number, number][]) =>
    ({
      id,
      at: s * 1_000,
      kind: 'tankbuster',
      hits: hits.map(([player, unmitigated]) => ({ player, unmitigated, avoidable: false })),
    }) as unknown as Mechanic;
  const mechanics = [
    mechanic(1, 20, [[1, 80_000]]),
    mechanic(2, 40, [[2, 150_000]]),
    mechanic(3, 130, [[1, 90_000]]),
    mechanic(4, 150, [[3, 200_000]]),
  ];
  const run = (tools: HealTool[], last = false, spent: Spent[] = []) =>
    tankBuffs(tools, spent, new Weaving(), mechanics, players, last).map((u) => [u.name, u.at, u.target]);

  it('puts each card on the tank taking the biggest hit of the next minute, just before it', () => {
    expect(run([arrow])).toEqual([
      ['the Arrow', 39_000, 2],
      ['the Arrow', 129_000, 1],
    ]);
  });

  it('plays the Arrow only where the tank takes at least 1.5 times their max HP in its 15s', () => {
    // 150,000 is 2.1 times 70,000; 90,000 only 1.3 times.
    const light = players.map((p) => (p.role === 'tank' ? { ...p, maxHp: 70_000 } : p));

    expect(tankBuffs([arrow], [], new Weaving(), mechanics, light).map((u) => [u.at, u.target])).toEqual([[39_000, 2]]);
  });

  it('plays the Ewer, one a draw, on the tank taking at least 0.8 times their max HP in its 15s', () => {
    // 150,000 is 1.25 times 120,000, and 90,000 only 0.75 times.
    const ewer = tool(37028, 'the Ewer', 1_000, { name: 'the Ewer', gainMs: 110_000, max: 1, refills: [0, 110_000] });
    const heavier = players.map((p) => (p.role === 'tank' ? { ...p, maxHp: 120_000 } : p));

    expect(tankBuffs([ewer], [], new Weaving(), mechanics, heavier).map((u) => [u.name, u.at, u.target])).toEqual([
      ['the Ewer', 39_000, 2],
    ]);
  });

  it('places Protraction only in the last pass, as its recast allows, never for a hit on someone not a tank', () => {
    expect(run([arrow, protraction], true)).toEqual([
      ['Protraction', 39_000, 2],
      ['Protraction', 129_000, 1],
    ]);
  });

  it('takes no weave slot already taken: a busy one moves it earlier', () => {
    const busy = [0, 1].map((n) => ({
      player: 3,
      action: 7434,
      at: 39_000 - n * 700,
      group: '3:excog',
      pool: null,
      gcd: false,
      castMs: 0,
    }));

    expect(run([protraction], true, busy)[0][1]).toBeLessThan(38_300);
  });
});
