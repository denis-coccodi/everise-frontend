import type { Candidate } from './heal-plan.model';
import type { HealTool, Mechanic, PlannedUse } from './plan.model';
import { soonerRelease } from './delayed-heals';

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

  it('sets it off a second after the last raidwide of its window', () => {
    const sooner = soonerRelease(pick(15_000), [hit(14_000, 8), hit(19_000, 8), hit(20_000, 2)], eventsFor);
    expect(sooner.delayMs).toBe(10_000);
    expect(sooner.events).toEqual([{ at: 20_000, player: 1, amount: 1 }]);
  });

  it('leaves it to its end where the last raidwide comes in its final 4s, none comes, or it was set off already', () => {
    expect(soonerRelease(pick(15_000), [hit(22_000, 8)], eventsFor).delayMs).toBe(15_000);
    expect(soonerRelease(pick(15_000), [hit(15_000, 3)], eventsFor).delayMs).toBe(15_000);
    expect(soonerRelease(pick(10_000), [hit(14_000, 8)], eventsFor).delayMs).toBe(10_000);
    const plain = { ...macro, delayed: null } as unknown as HealTool;
    expect(soonerRelease(pick(0, plain), [hit(14_000, 8)], eventsFor).delayMs).toBe(0);
  });
});
