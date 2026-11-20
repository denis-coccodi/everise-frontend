import type { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { replacedSpells } from './mp-replaced';

describe('replacedSpells', () => {
  const action = (id: number, mpCost: number, gcd: boolean, kind?: string) => ({
    id,
    gcd,
    mpCost,
    effects: kind ? [{ kind }] : [],
  });
  const catalog = {
    actions: [
      action(1, 400, true), // Fall Malefic: a damage spell
      action(2, 700, true, 'heal'), // a GCD heal
      action(3, 0, true), // a GCD costing nothing
      action(4, 400, false), // an oGCD
    ],
  } as unknown as ActionCatalog;
  const cast = (at: number, action: number, source = 1) => ({ at, action, source, target: null, castMs: null });
  const timeline = {
    playerCasts: [cast(10_000, 1), cast(12_500, 2), cast(15_000, 3), cast(17_500, 4), cast(20_000, 1, 2)],
  } as unknown as PullTimeline;

  it("gives back a damage spell's MP where a planned GCD takes its slot", () => {
    const replaced = replacedSpells(timeline, catalog, new Set([1]), new Set());

    expect(replaced(1, 10_300)).toBe(400);
    // No damage spell there: a heal, a free GCD, an oGCD, or nothing near.
    expect([12_500, 15_000, 17_500, 11_000].map((at) => replaced(1, at))).toEqual([0, 0, 0, 0]);
    // Not one of the players asked about.
    expect(replaced(2, 20_000)).toBe(0);
  });

  it("gives back none for a spell the plan places itself: that one's undone already", () => {
    expect(replacedSpells(timeline, catalog, new Set([1]), new Set(['1:1']))(1, 10_000)).toBe(0);
  });
});
