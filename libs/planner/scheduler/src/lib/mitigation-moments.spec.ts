import type { Mechanic, MitigationTool } from './plan.model';
import { waitsForBigger } from './mitigation-moments';

// A raidwide at 30s (the paladin, 1, takes 60% of their HP) and their tank
// buster at 60s (140%); max HP 100,000.
const mechanic = (id: number, at: number, kind: Mechanic['kind'], hits: [number, number][]): Mechanic => ({
  id,
  at,
  action: id,
  name: `M${id}`,
  kind,
  damageType: 'magic',
  hits: hits.map(([player, unmitigated]) => ({ player, unmitigated, asPlayed: unmitigated, avoidable: false })),
});
const raidwide = mechanic(1, 30_000, 'raidwide', [
  [1, 60_000],
  [3, 150_000],
]);
const buster = mechanic(2, 60_000, 'tankbuster', [[1, 140_000]]);
const tool = (target: 'self' | 'party', recastS: number): MitigationTool => ({
  player: 1,
  action: 7531,
  name: 'Rampart',
  recastMs: recastS * 1000,
  charges: 1,
  gcd: false,
  castMs: 0,
  group: '1:1',
  pool: null,
  grantedBy: null,
  effects: [
    {
      target,
      status: 'Rampart',
      stack: 'Rampart',
      physical: 0.2,
      magic: 0.2,
      shield: null,
      durationMs: 20_000,
      invulnerable: null,
      hits: 1,
    },
  ],
});
const weight = (_m: Mechanic, h: Mechanic['hits'][number]) => h.unmitigated / 100_000;

describe('waitsForBigger', () => {
  it("keeps a tank's own cooldown from a raidwide for their tank buster still to plan, within its recast", () => {
    expect(waitsForBigger(raidwide, tool('self', 90), [buster], weight)).toBe(true);
  });

  it('lets it go where the bigger hit is planned already, out of its recast, or the cooldown is the party’s', () => {
    expect(waitsForBigger(raidwide, tool('self', 90), [], weight)).toBe(false);
    expect(waitsForBigger(raidwide, tool('self', 20), [buster], weight)).toBe(false);
    expect(waitsForBigger(raidwide, tool('party', 90), [buster], weight)).toBe(false);
    expect(waitsForBigger(buster, tool('self', 90), [raidwide], weight)).toBe(false);
  });
});
