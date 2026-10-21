import { fitsPool, fitsRecast, projected } from './coverage';
import { Mechanic, MitigationTool, PlannedUse } from './plan.model';

const tool = (name: string, share: number, stack = name): MitigationTool => ({
  player: 1,
  action: name.length,
  name,
  recastMs: 60_000,
  charges: 1,
  group: name,
  pool: null,
  effects: [{ target: 'party', share, durationMs: 15_000, status: name, stack }],
});
const use = (name: string, at: number): PlannedUse => ({
  player: 1,
  action: name.length,
  name,
  at,
  target: null,
  covers: [],
});
const mechanic: Mechanic = {
  id: 0,
  at: 10_000,
  action: 100,
  name: 'Raidwide',
  kind: 'raidwide',
  hits: [{ player: 2, unmitigated: 100_000, asPlayed: 80_000 }],
};

describe('projected', () => {
  it('multiplies the mitigations up when the hit lands, and names them', () => {
    const tools = new Map([
      ['Reprisal', tool('Reprisal', 0.1)],
      ['Sacred Soil', tool('Sacred Soil', 0.1)],
      ['Troubadour', tool('Troubadour', 0.15)],
    ]);
    const uses = [use('Reprisal', 5_000), use('Sacred Soil', 9_000), use('Troubadour', 11_000)];

    // Troubadour goes up after the hit.
    expect(projected(mechanic, mechanic.hits[0], uses, (u) => tools.get(u.name) as MitigationTool)).toEqual({
      damage: 81_000,
      statuses: ['Reprisal', 'Sacred Soil'],
    });
  });

  it('counts statuses that share a stack once, the strongest', () => {
    const tools = new Map([
      ['Troubadour', tool('Troubadour', 0.15, 'ranged')],
      ['Tactician', tool('Tactician', 0.1, 'ranged')],
    ]);
    const uses = [use('Tactician', 5_000), use('Troubadour', 6_000)];

    expect(projected(mechanic, mechanic.hits[0], uses, (u) => tools.get(u.name) as MitigationTool).damage).toBe(85_000);
  });
});

describe('fitsRecast', () => {
  it('keeps uses a recast apart, and lets charges come closer', () => {
    expect(fitsRecast([0], 59_000, 60_000, 1)).toBe(false);
    expect(fitsRecast([0], 60_000, 60_000, 1)).toBe(true);
    expect(fitsRecast([0], 1_000, 60_000, 2)).toBe(true);
    expect(fitsRecast([0, 1_000], 2_000, 60_000, 2)).toBe(false);
  });
});

describe('fitsPool', () => {
  const pool = { name: 'Aetherflow', gainMs: 20_000, max: 3 };

  it('starts full, then refills one per gain', () => {
    expect(fitsPool([0, 1_000], 2_000, pool)).toBe(true);
    expect(fitsPool([0, 1_000, 2_000], 3_000, pool)).toBe(false);
    expect(fitsPool([0, 1_000, 2_000], 23_000, pool)).toBe(true);
  });
});
