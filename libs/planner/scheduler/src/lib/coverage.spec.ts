import { fitsGrant, fitsPool, fitsRecast, poolFull, projected } from './coverage';
import { Mechanic, MitigationEffect, MitigationTool, PlannedUse } from './plan.model';
import type { PullFacts } from './coverage.model';

// `share`: the same share of physical and magic damage.
type EffectValues = Partial<MitigationEffect> & { share?: number };
const effect = (name: string, { share = 0, ...values }: EffectValues): MitigationEffect => ({
  target: 'party',
  physical: share,
  magic: share,
  shield: null,
  hits: 1,
  durationMs: 15_000,
  status: name,
  stack: name,
  invulnerable: null,
  ...values,
});
const tool = (name: string, values: EffectValues): MitigationTool => ({
  player: 1,
  action: name.length,
  name,
  recastMs: 60_000,
  charges: 1,
  gcd: false,
  castMs: 0,
  group: name,
  pool: null,
  grantedBy: null,
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
  damageType: 'magic',
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
      invulnerable: false,
    });
  });

  it('counts statuses that share a stack once, the strongest', () => {
    const tools = [
      tool('Troubadour', { share: 0.15, stack: 'ranged' }),
      tool('Tactician', { share: 0.1, stack: 'ranged' }),
    ];

    expect(project(10_000, tools, [use('Tactician', 5_000), use('Troubadour', 6_000)]).damage).toBe(85_000);
  });

  it("takes the share for the hit's damage type: physical or magic, none of unique damage", () => {
    // Feint: 10% physical, 5% magic.
    const feint = [tool('Feint', { physical: 0.1, magic: 0.05 })];
    const shielded = [
      tool('Feint', { physical: 0.1, magic: 0.05 }),
      tool('Divine Benison', { shield: { hp: 30_000 } }),
    ];
    const uses = [use('Feint', 9_000), use('Divine Benison', 9_000)];
    const at = (damageType: Mechanic['damageType'], tools = feint) =>
      projected(
        { ...mechanic(10_000), damageType },
        mechanic(10_000).hits[0],
        uses.slice(0, tools.length),
        (u) => tools.find((t) => t.name === u.name) as MitigationTool,
        facts,
      );

    expect(at('physical').damage).toBe(90_000);
    expect(at('magic').damage).toBe(95_000);
    // Where the log doesn't say: the smaller.
    expect(at(null).damage).toBe(95_000);
    // Unique damage: no mitigation, but shields still take it.
    expect(at('unique', shielded)).toEqual({
      damage: 70_000,
      absorbed: 30_000,
      statuses: ['Divine Benison'],
      invulnerable: false,
    });
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
      invulnerable: false,
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

describe('projected under an invulnerability', () => {
  const tools = [
    tool('Hallowed Ground', { target: 'party', invulnerable: 'immune' }),
    tool('Holmgang', { target: 'party', invulnerable: 'lastHp' }),
    tool('Reprisal', { share: 0.1 }),
  ];

  it('takes the whole hit off, unless it keeps the last HP, where the hit still lands', () => {
    expect(project(10_000, tools, [use('Hallowed Ground', 5_000), use('Reprisal', 5_000)])).toEqual({
      damage: 0,
      absorbed: 0,
      statuses: ['Hallowed Ground'],
      invulnerable: true,
    });
    expect(project(10_000, tools, [use('Holmgang', 5_000), use('Reprisal', 5_000)])).toEqual({
      damage: 90_000,
      absorbed: 0,
      statuses: ['Reprisal', 'Holmgang'],
      invulnerable: true,
    });
    expect(project(30_000, tools, [use('Hallowed Ground', 5_000)]).invulnerable).toBe(false);
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

  it('says when it is full, and a use then costs nothing', () => {
    expect(poolFull([], 5_000, pool)).toBe(true);
    expect(poolFull([0], 5_000, pool)).toBe(false);
    expect(poolFull([0], 20_000, pool)).toBe(true);
    expect(poolFull([0, 10_000], 25_000, pool)).toBe(false);
  });
});

describe('fitsGrant', () => {
  // Divine Caress: once in the 30s after each Temperance.
  const once = { action: 16536, withinMs: 30_000, uses: 1 };

  it('needs a grant before each use, used once each', () => {
    expect(fitsGrant([], [10_000], 25_000, once)).toBe(true);
    expect(fitsGrant([], [10_000], 45_000, once)).toBe(false);
    expect(fitsGrant([], [], 25_000, once)).toBe(false);
    expect(fitsGrant([25_000], [10_000], 30_000, once)).toBe(false);
    expect(fitsGrant([25_000], [10_000, 130_000], 140_000, once)).toBe(true);
  });

  it('allows as many as fit in a window that grants any number', () => {
    const seraphism = { action: 37014, withinMs: 20_000, uses: Infinity };

    expect(fitsGrant([1_000, 3_500, 6_000], [0], 8_500, seraphism)).toBe(true);
    expect(fitsGrant([1_000], [0], 21_000, seraphism)).toBe(false);
  });
});
