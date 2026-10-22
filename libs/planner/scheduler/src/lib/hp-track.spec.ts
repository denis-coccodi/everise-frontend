import { HpTrack } from './hp-track';

describe('HpTrack', () => {
  const track = () =>
    new HpTrack(new Map([[1, 100_000]]), [
      { at: 10_000, player: 1, amount: -70_000 },
      { at: 20_000, player: 1, amount: -50_000 },
      { at: 30_000, player: 1, amount: 200_000 },
      // No max HP: not tracked.
      { at: 10_000, player: 2, amount: -1 },
    ]);

  it('follows the HP from full, never below 0 or above max HP', () => {
    const t = track();
    const start = t.checkpoint(1, -1);
    if (!start) throw new Error('no checkpoint');

    expect(t.before(start, 10_000)).toBe(100_000);
    expect(t.before(start, 15_000)).toBe(30_000);
    expect(t.before(start, 25_000)).toBe(0);
    expect(t.before(start, 35_000)).toBe(100_000);
    expect(t.checkpoint(2, 0)).toBeNull();
  });

  it("leaves an event's floor at least", () => {
    const t = new HpTrack(new Map([[1, 100_000]]), [{ at: 10_000, player: 1, amount: -150_000, floor: 1 }]);
    const start = t.checkpoint(1, -1);
    if (!start) throw new Error('no checkpoint');

    expect(t.before(start, 15_000)).toBe(1);
  });

  it('counts extra events from a checkpoint, and keeps events added later', () => {
    const t = track();
    const after = t.checkpoint(1, 10_000);
    if (!after) throw new Error('no checkpoint');

    expect(after.hp).toBe(30_000);
    expect(t.before(after, 25_000, [{ at: 15_000, player: 1, amount: 40_000 }])).toBe(20_000);

    t.add([{ at: 15_000, player: 1, amount: 40_000 }]);
    expect(t.before(after, 25_000)).toBe(20_000);
  });

  it('finds when the HP first drops to a level, within a window', () => {
    const t = track();

    expect(t.firstAtOrBelow(1, 0, 60_000, 50_000)).toBe(10_000);
    // Already at 30,000 when the window opens.
    expect(t.firstAtOrBelow(1, 10_000, 60_000, 50_000)).toBe(10_000);
    expect(t.firstAtOrBelow(1, 30_000, 60_000, 50_000)).toBeNull();
    expect(t.firstAtOrBelow(1, 0, 5000, 50_000)).toBeNull();
    expect(t.firstAtOrBelow(2, 0, 60_000, 50_000)).toBeNull();
  });
});
