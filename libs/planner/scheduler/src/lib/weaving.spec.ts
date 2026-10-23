import { Weaving } from './weaving';

describe('Weaving', () => {
  // Player 1 used GCDs every 2.5s from 10s: instant ones, then at 15s a
  // 1.5s cast and at 17.5s a 2s one; their Fast Blade-like oGCD 42 at 10.6s
  // stays (the plan doesn't schedule it), their Rampart (7531) doesn't.
  const cast = (at: number, action: number, castMs: number | null = null) => ({
    at,
    source: 1,
    target: null,
    action,
    castMs,
  });
  const gcdOf = new Map([
    [9, true],
    [190, true],
    [42, false],
    [7531, false],
  ]);
  const weaving = new Weaving(
    [
      cast(10_000, 9),
      cast(10_600, 42),
      cast(12_500, 9),
      cast(15_000, 190, 1500),
      cast(17_500, 190, 2000),
      cast(20_000, 9),
      cast(12_000, 7531),
    ],
    gcdOf,
    (_, action) => action === 7531,
  );
  const ogcd = (at: number) => ({ at, gcd: false, castMs: 0 });

  it('weaves two oGCDs after an instant GCD, beside the oGCDs kept', () => {
    // From 10s: the lock to 10.6s, the kept oGCD to 11.3s, room for one
    // more before the GCD at 12.5s, as late as it goes.
    expect(weaving.ogcdBefore(1, 12_400, 10_000, [])).toBe(11_800);
    expect(weaving.ogcdBefore(1, 12_400, 10_000, [ogcd(11_800)])).toBeNull();
    // After the instant GCD at 12.5s: two.
    expect(weaving.ogcdBefore(1, 15_000, 12_500, [ogcd(14_300)])).toBe(13_600);
    expect(weaving.ogcdBefore(1, 15_000, 12_500, [ogcd(14_300), ogcd(13_600)])).toBeNull();
  });

  it('weaves one after a 1.5s cast, none after a 2s one', () => {
    expect(weaving.ogcdAfter(1, 15_000, 17_500, [])).toBe(16_500);
    expect(weaving.ogcdAfter(1, 15_000, 17_500, [ogcd(16_500)])).toBeNull();
    expect(weaving.ogcdAfter(1, 17_500, 20_000, [])).toBeNull();
  });

  it("puts a GCD in place of one of the player's, its cast bar taking the room after it", () => {
    expect(weaving.gcdBefore(1, 13_000, 10_000, 0, [])).toBe(12_500);
    // That one taken: the one before.
    expect(weaving.gcdBefore(1, 13_000, 10_000, 0, [{ at: 12_500, gcd: true, castMs: 0 }])).toBe(10_000);
    // A 2s cast at 12.5s leaves no room for an oGCD before 15s.
    expect(weaving.ogcdAfter(1, 12_500, 15_000, [{ at: 12_500, gcd: true, castMs: 2000 }])).toBeNull();
    // Nor does it fit where an oGCD is already woven after it.
    expect(weaving.gcdBefore(1, 13_000, 12_000, 2000, [ogcd(13_600)])).toBeNull();
  });

  it('lets a player the pull has no GCDs of act freely, an oGCD a weave and a GCD 2.5s apart', () => {
    const free = new Weaving();

    expect(free.ogcdBefore(2, 30_000, 0, [])).toBe(30_000);
    expect(free.ogcdBefore(2, 30_000, 0, [ogcd(30_000)])).toBe(29_300);
    expect(free.gcdBefore(2, 30_000, 0, 0, [{ at: 29_000, gcd: true, castMs: 0 }])).toBe(26_500);
  });
});
