import { firstPressAt, ogcdWithFirstBefore } from './first-press';
import type { MitigationTool } from './plan.model';
import { slotCache } from './slot-cache';
import { Weaving } from './weaving';

describe('slotCache', () => {
  // Player 1's instant GCDs every 2.5s from 10s.
  const weaving = new Weaving(
    [10_000, 12_500, 15_000, 17_500, 20_000].map((at) => ({ at, source: 1, target: null, action: 9, castMs: null })),
    new Map([[9, true]]),
  );
  const tool = (action: number, gcd = false) => ({ player: 1, action, gcd, castMs: 0 }) as MitigationTool;
  const ogcd = (at: number) => ({ at, gcd: false, castMs: 0 });

  it('answers as the weaving does, asked again or not, and as the uses change', () => {
    const slots = slotCache(weaving);
    const grassa = tool(34686);
    for (const occupied of [[], [ogcd(16_800)], [ogcd(16_800), ogcd(16_100)], []]) {
      for (let n = 0; n < 2; n++) {
        expect(slots.slot(grassa, 17_400, 12_500, occupied)).toBe(
          ogcdWithFirstBefore(weaving, 1, 34686, 17_400, 12_500, occupied),
        );
        expect(slots.slot(tool(7531), 17_400, 12_500, occupied)).toBe(weaving.ogcdBefore(1, 17_400, 12_500, occupied));
        const firstAt = firstPressAt(weaving, 1, 34686, 16_800, occupied);
        expect(slots.first(grassa, 16_800, occupied)).toEqual(typeof firstAt === 'number' ? { firstAt } : {});
      }
    }
  });

  it("answers a GCD's as the weaving does", () => {
    const slots = slotCache(weaving);
    expect(slots.slot(tool(16, true), 17_400, 12_500, [])).toBe(weaving.gcdBefore(1, 17_400, 12_500, 0, []));
  });
});
