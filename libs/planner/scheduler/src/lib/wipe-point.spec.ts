import type { PullTimeline } from '@everise/core/api-types';
import { pull } from './scheduler-fixtures';
import { wipePoint } from './wipe-point';

type Hit = [number, string, number, number];
const death = (seconds: number, player: number) => ({ at: seconds * 1000, player, action: null, source: null });
// The paladin (1), the scholar (2) and the bard (3) hit by `hits`, dying
// at `deaths` ([seconds, player]), acting at `acts`.
function wipe(hits: Hit[], deaths: [number, number][], acts: [number, number][] = []): PullTimeline {
  return {
    ...pull(hits),
    durationMs: 120_000,
    deaths: deaths.map(([at, player]) => death(at, player)),
    playerCasts: acts.map(([at, source]) => ({ at: at * 1000, source, target: null, action: 7531, castMs: null })),
  };
}
const everyone = (seconds: number, name: string, damage = 999_999): Hit[] =>
  [1, 2, 3].map((p) => [seconds, name, p, damage]);
const raidwides = (...seconds: number[]): Hit[] =>
  seconds.flatMap((s) => [1, 3].map((p): Hit => [s, `Raidwide ${s}`, p, 30_000]));

describe('wipePoint', () => {
  it('is just before the mechanic that killed everyone', () => {
    expect(
      wipePoint(
        wipe(everyone(100, 'Finale'), [
          [101, 1],
          [101, 2],
          [101, 3],
        ]),
      ),
    ).toBe(99_999);
  });

  it('is the end of a log without deaths', () => {
    expect(wipePoint(wipe(everyone(100, 'Raidwide', 10_000), []))).toBe(120_000);
  });

  it('is the end of a log the party lived on long after the last death in', () => {
    const hits: Hit[] = [[20, 'Spike', 2, 999_999], ...raidwides(30, 40, 50, 60, 70)];

    expect(wipePoint(wipe(hits, [[20.5, 2]]))).toBe(120_000);
  });

  it('leaves out a death the player was raised from', () => {
    const hits: Hit[] = [[49, 'Spike', 2, 999_999], ...everyone(100, 'Finale')];
    const deaths: [number, number][] = [
      [50, 2],
      [101, 1],
      [101, 2],
      [101, 3],
    ];

    expect(wipePoint(wipe(hits, deaths, [[60, 2]]))).toBe(99_999);
  });

  it('starts at the first mechanic of the final deaths, nobody raised after', () => {
    // The healer goes first; the others die to the next mechanics.
    const hits: Hit[] = [
      [60, 'Comet', 2, 999_999],
      ...raidwides(70, 80),
      [90, 'Slam', 1, 999_999],
      [90, 'Slam', 3, 999_999],
    ];

    expect(
      wipePoint(
        wipe(hits, [
          [60.5, 2],
          [90.5, 1],
          [90.5, 3],
        ]),
      ),
    ).toBe(59_999);
  });

  it('starts after a moment one of whose deaths was raised', () => {
    const hits: Hit[] = [
      [50, 'Cleave', 1, 999_999],
      [50, 'Cleave', 3, 999_999],
      [69.5, 'Slam', 2, 999_999],
      [71.5, 'Slam', 3, 999_999],
    ];
    const deaths: [number, number][] = [
      [50.5, 1],
      [50.5, 3],
      [70, 2],
      [72, 3],
    ];

    expect(wipePoint(wipe(hits, deaths, [[60, 3]]))).toBe(69_499);
  });

  it('leaves out an early death the party lived on long after', () => {
    const hits: Hit[] = [[20, 'Spike', 2, 999_999], ...raidwides(30, 40, 50, 60, 70), ...everyone(100, 'Finale')];

    expect(
      wipePoint(
        wipe(hits, [
          [20.5, 2],
          [101, 1],
          [101, 3],
        ]),
      ),
    ).toBe(99_999);
  });

  it('takes the boss cast before a death no hit explains', () => {
    const timeline = wipe(
      [],
      [
        [95, 1],
        [95, 2],
        [95, 3],
      ],
    );
    timeline.actions = [
      { id: 500, name: 'Mana Burst' },
      { id: 501, name: 'attack' },
    ];
    timeline.enemyCasts = [90, 91, 94].map((s, i) => ({
      at: s * 1000,
      source: 13,
      target: null,
      action: i < 2 ? 500 : 501,
      castMs: null,
    }));

    expect(wipePoint(timeline)).toBe(89_999);
  });

  it('starts at an auto-attack that killed a tank', () => {
    const hits: Hit[] = [
      [99, 'Attack', 1, 999_999],
      [110, 'Fire Breath', 2, 999_999],
      [110, 'Fire Breath', 3, 999_999],
    ];

    expect(
      wipePoint(
        wipe(hits, [
          [100, 1],
          [111, 2],
          [111, 3],
        ]),
      ),
    ).toBe(98_999);
  });
});
