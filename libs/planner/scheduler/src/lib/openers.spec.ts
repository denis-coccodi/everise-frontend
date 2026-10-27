import { action, catalog, pull } from './scheduler-fixtures';
import { scholarTimes, withStacksLeft } from './openers';

describe('scholarTimes', () => {
  // The scholar (2) casting a GCD every 2.5s from the countdown's Broil
  // (landing at 0.5s), and a Dissipation at 200s.
  const timeline = () => {
    const t = pull([]);
    t.durationMs = 250_000;
    t.playerCasts = [
      ...Array.from({ length: 12 }, (_, i) => ({
        at: 500 + i * 2500,
        source: 2,
        target: null,
        action: 9,
        castMs: null,
      })),
      { at: 200_000, source: 2, target: null, action: 3587, castMs: null },
    ];
    return t;
  };
  const cat = () => {
    const c = catalog();
    c.actions.push(action(9, 'Broil IV', ['SCH'], 2.5, [], { gcd: true }));
    return c;
  };

  it("weaves the standard opener's steps after the scholar's GCDs: Aetherflow, then Dissipation", () => {
    const times = scholarTimes(timeline(), cat(), 2, 'standard');

    // Aetherflow after the 1st GCD (3s + 0.7s), then on cooldown; Dissipation
    // after the 6th, and the one played after the opener.
    expect(times.aetherflow).toEqual([3_700, 63_700, 123_700, 183_700, 243_700]);
    expect(times.dissipation).toEqual([16_200, 200_000]);
    expect(times.uses.map((u) => [u.action, u.at])).toEqual([
      [166, 3_700],
      [7436, 6_200],
      [167, 8_700],
      [167, 11_200],
      [167, 13_700],
      [3587, 16_200],
      [37012, 18_700],
      [167, 21_200],
      [167, 23_700],
      [167, 26_200],
    ]);
    expect(times.uses.every((u) => u.opener)).toBe(true);
  });

  it('swaps them for Dissipation first, and has no steps with none', () => {
    const first = scholarTimes(timeline(), cat(), 2, 'dissipation-first');
    expect(first.dissipation[0]).toBe(3_700);
    expect(first.aetherflow[0]).toBe(16_200);

    const none = scholarTimes(timeline(), cat(), 2, 'none');
    expect(none.uses).toEqual([]);
    expect(none.aetherflow[0]).toBe(3_700);
    expect(none.dissipation).toEqual([200_000]);
  });
});

describe('withStacksLeft', () => {
  const drain = (at: number) => ({
    player: 2,
    action: 167,
    name: 'Energy Drain',
    at,
    target: null,
    covers: [],
    opener: true,
  });
  const chain = { player: 2, action: 7436, name: 'Chain Stratagem', at: 6_000, target: null, covers: [], opener: true };

  it('drops the latest Energy Drains of a refill for the stacks its heals take', () => {
    // Aetherflow at 3s, Dissipation at 16s; a Sacred Soil at 8s.
    const uses = [chain, drain(9_000), drain(11_000), drain(13_000), drain(21_000), drain(23_000), drain(26_000)];

    expect(withStacksLeft(uses, [3_000, 16_000], [8_000]).map((u) => u.at)).toEqual([
      6_000, 9_000, 11_000, 21_000, 23_000, 26_000,
    ]);
  });
});
