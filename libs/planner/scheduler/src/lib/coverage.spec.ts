import { chargeAt, fitsGrant, fitsPool, fitsRecast, poolFull, poolLevel, projected } from './coverage';
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
  hits: [{ player: 2, unmitigated: 100_000, asPlayed: 80_000, avoidable: false }],
});
// Player 2 has 200,000 HP and was hit at 10s and 12s.
const facts: PullFacts = {
  maxHp: new Map([[2, 200_000]]),
  hitsBetween: (_player, from, to) => [10_000, 12_000].filter((at) => at >= from && at < to).length,
  walkingDeadEnd: (_player, from) => from,
  shieldTimes: () => 1,
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

  it('keeps the Galvanize or Eukrasian barrier up first, as the game does; else the biggest of a stack counts', () => {
    const family = 'Galvanize or a Eukrasian barrier';
    const tools = [
      tool('Galvanize', { shield: { hp: 20_000 }, stack: family }),
      tool('Eukrasian Prognosis', { shield: { hp: 50_000 }, stack: family }),
      tool('Small', { shield: { hp: 20_000 }, stack: 'other' }),
      tool('Big', { shield: { hp: 50_000 }, stack: 'other' }),
    ];
    const first = [use('Galvanize', 8_000), use('Eukrasian Prognosis', 9_000)];

    expect(project(10_000, tools, first)).toMatchObject({ absorbed: 20_000, statuses: ['Galvanize'] });
    expect(project(10_000, tools, [use('Small', 8_000), use('Big', 9_000)])).toMatchObject({ absorbed: 50_000 });
  });
});

describe('projected with a GCD shield', () => {
  it("grows the shield with its caster's healing potency buffs, not an oGCD's", () => {
    const boosted = { ...facts, shieldTimes: () => 1.2 };
    const gcd = { ...tool('Galvanize', { shield: { hp: 30_000 } }), gcd: true };
    const ogcd = tool('Divine Benison', { shield: { hp: 30_000 } });
    const at = (t: MitigationTool) => {
      const m = mechanic(10_000);
      return projected(m, m.hits[0], [use(t.name, 9_000)], () => t, boosted).absorbed;
    };

    expect([at(gcd), at(ogcd)]).toEqual([36_000, 30_000]);
  });

  it('goes up when its cast bar ends: one begun before a hit and landing after it is there for the next', () => {
    const galvanize = { ...tool('Galvanize', { shield: { hp: 30_000 } }), gcd: true, castMs: 2_000 };
    const shield = (at: number, u: PlannedUse) => {
      const m = mechanic(at);
      return projected(m, m.hits[0], [u], () => galvanize, facts).absorbed;
    };

    // Begun at 9.5s, it lands at 11.5s: after the 10s hit, before the 12s one.
    expect([shield(10_000, use('Galvanize', 9_500)), shield(12_000, use('Galvanize', 9_500))]).toEqual([0, 30_000]);
    // One as played is at when it landed already.
    expect(shield(10_000, { ...use('Galvanize', 9_500), landed: true })).toBe(30_000);
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

  it("keeps Living Dead's user alive past its 10s, to the end of the Walking Dead it set off", () => {
    const livingDead = tool('Living Dead', { target: 'self', durationMs: 10_000, invulnerable: 'walkingDead' });
    const cast = { ...use('Living Dead', 5_000), player: 2 };
    // Its first hit at 10s sets off Walking Dead, to 20s.
    const until = { ...facts, walkingDeadEnd: (_player: number, from: number) => (from <= 10_000 ? 20_000 : from) };
    const at = (ms: number) => {
      const m = mechanic(ms);
      return projected(m, m.hits[0], [cast], () => livingDead, until).invulnerable;
    };

    expect(at(17_000)).toBe(true);
    expect(at(21_000)).toBe(false);
  });
});

describe('fitsRecast', () => {
  it('keeps uses a recast apart, and lets charges come closer', () => {
    expect(fitsRecast([0], 59_000, 60_000, 1)).toBe(false);
    expect(fitsRecast([0], 60_000, 60_000, 1)).toBe(true);
    expect(fitsRecast([0], 1_000, 60_000, 2)).toBe(true);
    expect(fitsRecast([0, 1_000], 2_000, 60_000, 2)).toBe(false);
  });

  it('brings charges back one at a time, a recast apart', () => {
    // Used at 0s and 1s: one back at 60s, the other at 120s.
    expect(fitsRecast([0, 1_000], 60_000, 60_000, 2)).toBe(true);
    expect(fitsRecast([0, 1_000, 60_000], 61_000, 60_000, 2)).toBe(false);
    expect(fitsRecast([0, 1_000, 60_000], 120_000, 60_000, 2)).toBe(true);
    // A use placed before the others is checked against them too.
    expect(fitsRecast([1_000, 60_000, 61_000], 0, 60_000, 2)).toBe(false);
  });
});

describe('chargeAt', () => {
  const cut = (at: number) => ({ at, ms: 5_000 });

  it('is now while a charge is left, else when the next comes back', () => {
    expect(chargeAt([0], [], 60_000, 2, 30_000)).toBe(30_000);
    expect(chargeAt([0, 1_000], [], 60_000, 2, 30_000)).toBe(60_000);
  });

  it('counts what casts take off the recast, before and after', () => {
    // Infuriate at 0s and 1s: back at 60s, less 5s for each Fell Cleave (10s, 20s before; 40s after 30s).
    expect(chargeAt([0, 1_000], [cut(10_000), cut(20_000), cut(40_000)], 60_000, 2, 30_000)).toBe(45_000);
    // A cut can't bring it back before the cast that made it.
    expect(chargeAt([0], [cut(57_000)], 60_000, 1, 56_000)).toBe(57_000);
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

describe('a pool earned at set moments', () => {
  // A Fey Union's worth of Faerie Gauge at 30s and at 50s.
  const pool = { name: 'Faerie Gauge', gainMs: 75_000, max: 2, earned: [30_000, 50_000] };

  it('starts empty, and fills only when earned', () => {
    expect(fitsPool([], 1_000, pool)).toBe(false);
    expect(fitsPool([], 30_000, pool)).toBe(true);
    expect(fitsPool([30_000], 40_000, pool)).toBe(false);
    expect(fitsPool([30_000], 50_000, pool)).toBe(true);
    expect(poolLevel([30_000], 200_000, pool)).toBe(1);
  });
});

describe('a pool refilled at set moments', () => {
  // Aetherflow at 2s and Dissipation at 15s: 3 stacks each, never more than 3.
  const pool = { name: 'Aetherflow', gainMs: 60_000, max: 3, refills: [2_000, 15_000] };

  it('starts empty and fills to 3 at each refill', () => {
    expect(fitsPool([], 1_000, pool)).toBe(false);
    expect(fitsPool([3_000, 4_000], 5_000, pool)).toBe(true);
    expect(fitsPool([3_000, 4_000, 5_000], 6_000, pool)).toBe(false);
    // A stack left over at the refill is lost: still 3, not 4.
    expect(fitsPool([3_000, 16_000, 17_000, 18_000], 19_000, pool)).toBe(false);
    expect(poolLevel([3_000], 10_000, pool)).toBe(2);
    expect(poolLevel([3_000], 15_000, pool)).toBe(3);
  });

  it('loses what it holds at each emptying: a card the other draw swaps out', () => {
    // Lady of Crowns from Umbral Draws at 10s and 120s; Astral Draw at 65s swaps it for the Lord.
    const lady = { name: 'Lady of Crowns', gainMs: 55_000, max: 1, refills: [10_000, 120_000], empties: [65_000] };
    expect(fitsPool([], 60_000, lady)).toBe(true);
    expect(fitsPool([], 90_000, lady)).toBe(false);
    expect(fitsPool([], 65_000, lady)).toBe(false);
    expect(fitsPool([], 125_000, lady)).toBe(true);
    expect(poolLevel([], 90_000, lady)).toBe(0);
    expect(poolLevel([], 125_000, lady)).toBe(1);
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
