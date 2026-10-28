import type { Mechanic } from './plan.model';
import { severityOf } from './severity';

// The tank (1) has 300,000 HP, the others (2-8) 100,000.
const maxHp = new Map<number, number | null>([
  [1, 300_000],
  ...[2, 3, 4, 5, 6, 7, 8].map((p) => [p, 100_000] as const),
]);
const mechanic = (kind: Mechanic['kind'], hits: [number, number, boolean?][]): Mechanic => ({
  id: 1,
  at: 10_000,
  action: 100,
  name: 'Attack',
  kind,
  damageType: 'magic',
  hits: hits.map(([player, unmitigated, failed]) => ({
    player,
    unmitigated,
    asPlayed: unmitigated,
    avoidable: false,
    ...(failed ? { failed } : {}),
  })),
});
const tier = (m: Mechanic) => severityOf(m, maxHp)?.tier;

describe('how hard an attack hits', () => {
  it('goes by the damage before mitigation, as a share of each max HP: light to overkill', () => {
    const raidwide = (each: number) =>
      mechanic(
        'raidwide',
        [2, 3, 4, 5, 6, 7, 8].map((p) => [p, each]),
      );

    expect(tier(raidwide(20_000))).toBe('light');
    expect(tier(raidwide(45_000))).toBe('moderate');
    expect(tier(raidwide(75_000))).toBe('heavy');
    expect(tier(raidwide(100_000))).toBe('lethal');
    expect(tier(raidwide(150_000))).toBe('overkill');
  });

  it('measures a raidwide per player, not summed over the party', () => {
    // 20% on each of seven players is still light, though it adds up to 140%.
    const m = mechanic(
      'raidwide',
      [2, 3, 4, 5, 6, 7, 8].map((p) => [p, 20_000]),
    );

    expect(severityOf(m, maxHp)).toEqual({ tier: 'light', kind: 'raidwide', share: 0.2, damageType: 'magic' });
  });

  it("measures a tank buster on the tank's own scale", () => {
    // 130% of the tank's max HP: half of real tank busters hit that hard.
    expect(tier(mechanic('tankbuster', [[1, 390_000]]))).toBe('heavy');
    // The same share on the party scale would be overkill.
    expect(tier(mechanic('targeted', [[2, 130_000]]))).toBe('overkill');
  });

  it("leaves a failed mechanic's hits out, and says nothing without max HP", () => {
    const m = mechanic('targeted', [
      [2, 40_000],
      [3, 900_000, true],
    ]);

    expect(tier(m)).toBe('moderate');
    expect(severityOf(m, new Map())).toBeNull();
  });
});
