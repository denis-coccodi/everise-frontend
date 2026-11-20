import type { PullTimeline } from '@everise/core/api-types';
import { burstWindows, windowDue } from './burst-windows';

const cast = (at: number, source: number, action: number) => ({ at, source, action, target: null, castMs: null });
const timeline = (casts: ReturnType<typeof cast>[]) => ({ playerCasts: casts }) as unknown as PullTimeline;

describe('burstWindows', () => {
  it("finds the party's windows: two players' raid buffs within 15s, by when the first came", () => {
    const windows = burstWindows(
      timeline([
        cast(5_000, 1, 16552), // Divination
        cast(6_000, 2, 7436), // Chain Stratagem
        cast(125_000, 1, 16552),
        cast(127_000, 2, 7436),
        // A late window, after downtime.
        cast(290_000, 2, 7436),
        cast(291_500, 1, 16552),
        // One player's alone isn't a window.
        cast(400_000, 1, 16552),
        cast(9_000, 3, 7541), // Second Wind: no raid buff
      ]),
    );
    expect(windows).toEqual([5_000, 125_000, 290_000]);
  });

  it("takes one player's where only they have raid buffs, and none without any", () => {
    expect(burstWindows(timeline([cast(5_000, 1, 16552), cast(125_000, 1, 16552)]))).toEqual([5_000, 125_000]);
    expect(burstWindows(timeline([cast(5_000, 1, 7541)]))).toEqual([]);
  });
});

describe('windowDue', () => {
  const windows = [5_000, 125_000, 290_000];

  it('puts a two-minute buff in the next window once back, however late', () => {
    expect(windowDue(125_000, 120_000, windows)).toBe(125_000);
    expect(windowDue(245_000, 120_000, windows)).toBe(290_000);
    // Back during a window (a few seconds into it): in it, at once.
    expect(windowDue(128_000, 120_000, windows)).toBe(128_000);
  });

  it('keeps a one-minute buff on cooldown, but for a window within half its recast', () => {
    expect(windowDue(65_000, 60_000, windows)).toBe(65_000);
    expect(windowDue(120_000, 60_000, windows)).toBe(125_000);
    expect(windowDue(185_000, 60_000, windows)).toBe(185_000);
  });

  it('goes on cooldown with no window left', () => {
    expect(windowDue(400_000, 120_000, windows)).toBe(400_000);
  });
});
