import type { Candidate } from './heal-plan.model';
import type { HealTool, Mechanic, PlannedUse } from './plan.model';
import { soonerRelease } from './delayed-heals';
import { Weaving } from './weaving';

describe('soonerRelease', () => {
  // Macrocosmos used at 10s: 15s to gather, Microcosmos to set it off sooner.
  const macro = {
    castMs: 0,
    delayed: { delaysMs: [15_000, 10_000], damageShare: 0.5, release: { action: 25875, name: 'Microcosmos' } },
  } as unknown as HealTool;
  const use = { player: 1, action: 25874, at: 10_000 } as PlannedUse;
  const pick = (delayMs: number, tool = macro) =>
    ({ use, tool, events: [], value: 1, delayMs, paired: null }) as Candidate;
  const hit = (at: number, players: number) =>
    ({
      at,
      kind: 'raidwide',
      hits: Array.from({ length: players }, (_, i) => ({ player: i, avoidable: false })),
    }) as unknown as Mechanic;
  const eventsFor = (_t: HealTool, _u: PlannedUse, delayMs: number) => [{ at: 10_000 + delayMs, player: 1, amount: 1 }];
  // Player 1 acts freely (no GCDs in the pull): any moment not taken is a slot.
  const free = new Weaving();
  const release = (p: Candidate, mechanics: Mechanic[], spent: { at: number }[] = []) =>
    soonerRelease(
      p,
      mechanics,
      eventsFor,
      free,
      spent.map(({ at }) => ({ player: 1, action: 1, at, group: 'x', pool: null, gcd: false, castMs: 0 })),
    );

  it('sets it off a second after the last raidwide of its window', () => {
    const sooner = release(pick(15_000), [hit(14_000, 8), hit(19_000, 8), hit(20_000, 2)]);
    expect(sooner.delayMs).toBe(10_000);
    expect(sooner.events).toEqual([{ at: 20_000, player: 1, amount: 1 }]);
  });

  it('presses it in the first weave slot free after that', () => {
    expect(release(pick(15_000), [hit(19_000, 8)], [{ at: 20_000 }]).delayMs).toBe(10_700);
    // None free before it ends: it heals as it ends.
    expect(
      release(
        pick(15_000),
        [hit(19_000, 8)],
        [
          { at: 20_000 },
          { at: 20_700 },
          { at: 21_400 },
          { at: 22_100 },
          { at: 22_800 },
          { at: 23_500 },
          { at: 24_200 },
          { at: 24_900 },
        ],
      ).delayMs,
    ).toBe(15_000);
  });

  it('prefers a gap no other oGCD of theirs is in', () => {
    // Instant GCDs every 2.5s from 10s; an oGCD at 20.6s, in the gap after the GCD at 20s: 23.1s, after the next one.
    const gcds = new Weaving(
      Array.from({ length: 9 }, (_, i) => ({
        at: 10_000 + i * 2_500,
        source: 1,
        target: null,
        action: 9,
        castMs: null,
      })),
      new Map([[9, true]]),
    );
    const spent = [{ player: 1, action: 1, at: 20_600, group: 'x', pool: null, gcd: false, castMs: 0 }];
    expect(soonerRelease(pick(15_000), [hit(19_000, 8)], eventsFor, gcds, spent).delayMs).toBe(13_100);
  });

  it('leaves it to its end where the last raidwide comes in its final 4s, none comes, or it was set off already', () => {
    expect(release(pick(15_000), [hit(22_000, 8)]).delayMs).toBe(15_000);
    expect(release(pick(15_000), [hit(15_000, 3)]).delayMs).toBe(15_000);
    expect(release(pick(10_000), [hit(14_000, 8)]).delayMs).toBe(10_000);
    const plain = { ...macro, delayed: null } as unknown as HealTool;
    expect(release(pick(0, plain), [hit(14_000, 8)]).delayMs).toBe(0);
  });
});
