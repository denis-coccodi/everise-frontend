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
    { id: 1, role: 'tank' },
    { id: 2, role: 'tank' },
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
