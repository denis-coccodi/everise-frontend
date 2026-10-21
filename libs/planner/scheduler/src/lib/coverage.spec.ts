import { PullFacts, fitsPool, fitsRecast, projected } from './coverage';
import { Mechanic, MitigationEffect, MitigationTool, PlannedUse } from './plan.model';

const effect = (name: string, values: Partial<MitigationEffect>): MitigationEffect => ({
  target: 'party',
  share: 0,
  shield: null,
  hits: 1,
  durationMs: 15_000,
  status: name,
  stack: name,
  ...values,
});
const tool = (name: string, values: Partial<MitigationEffect>): MitigationTool => ({
  player: 1,
  action: name.length,
  name,
  recastMs: 60_000,
  charges: 1,
  gcd: false,
  group: name,
  pool: null,
  effects: [effect(name, values)],
});
const use = (name: string, at: number): PlannedUse => ({
  player: 1,
  action: name.length,
  name,
  at,
  target: null,
  covers: [],
});
const mechanic = (at: number): Mechanic => ({
  id: 0,
  at,
  action: 100,
  name: 'Raidwide',
  kind: 'raidwide',
  hits: [{ player: 2, unmitigated: 100_000, asPlayed: 80_000 }],
});
// Player 2 has 200,000 HP and was hit at 10s and 12s.
const facts: PullFacts = {
  maxHp: new Map([[2, 200_000]]),
  hitsBetween: (_player, from, to) => [10_000, 12_000].filter((at) => at >= from && at < to).length,
};
const project = (at: number, tools: MitigationTool[], uses: PlannedUse[]) => {
  const byName = new Map(tools.map((t) => [t.name, t]));
  const m = mechanic(at);
  return projected(m, m.hits[0], uses, (u) => byName.get(u.name) as MitigationTool, facts);
};

describe('projected', () => {
  it('multiplies the mitigations up when the hit lands, and names them', () => {
    const tools = [
      tool('Reprisal', { share: 0.1 }),
      tool('Sacred Soil', { share: 0.1 }),
      tool('Troubadour', { share: 0.15 }),
    ];
    const uses = [use('Reprisal', 5_000), use('Sacred Soil', 9_000), use('Troubadour', 11_000)];

    // Troubadour goes up after the hit.
    expect(project(10_000, tools, uses)).toEqual({
      damage: 81_000,
      absorbed: 0,
      statuses: ['Reprisal', 'Sacred Soil'],
    });
  });

  it('counts statuses that share a stack once, the strongest', () => {
    const tools = [
      tool('Troubadour', { share: 0.15, stack: 'ranged' }),
      tool('Tactician', { share: 0.1, stack: 'ranged' }),
    ];

    expect(project(10_000, tools, [use('Tactician', 5_000), use('Troubadour', 6_000)]).damage).toBe(85_000);
  });

  it('takes shields off what mitigation leaves, sized in HP or by max HP', () => {
    const tools = [
      tool('Reprisal', { share: 0.1 }),
      tool('Divine Benison', { shield: { hp: 30_000 } }),
      tool('Blackest Night', { shield: { maxHpShare: 0.25 } }),
    ];
    const uses = [use('Reprisal', 9_000), use('Divine Benison', 9_000), use('Blackest Night', 9_000)];

    // 100,000 → 90,000 mitigated → 10,000 left after 30,000 + 50,000 shields.
    expect(project(10_000, tools, uses)).toEqual({
      damage: 10_000,
      absorbed: 80_000,
      statuses: ['Reprisal', 'Divine Benison', 'Blackest Night'],
    });
  });

  it('absorbs no more than the hit, and only on the first hits since the shield went up', () => {
    const tools = [tool('Big shield', { shield: { hp: 500_000 } }), tool('Haima', { shield: { hp: 10_000 }, hits: 2 })];

    expect(project(10_000, tools, [use('Big shield', 9_000)])).toMatchObject({ damage: 0, absorbed: 100_000 });
    // The 10s hit broke it.
    expect(project(12_000, tools, [use('Big shield', 9_000)])).toMatchObject({ damage: 100_000, absorbed: 0 });
    // Renewed once.
    expect(project(12_000, tools, [use('Haima', 9_000)])).toMatchObject({ absorbed: 10_000 });
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
