import { CatalogAction } from '@everise/core/api-types';
import { aetherflowAtPull, aetherflowShort, enablersMissing, poolsShort, recastsShort } from './legality-rules';
import type { LegalityCast } from './plan-legality.model';

const action = (id: number, name: string, recastS: number, extra: Partial<CatalogAction> = {}): CatalogAction => ({
  id,
  name,
  icon: null,
  description: null,
  jobs: ['SCH'],
  level: 100,
  gcd: false,
  castMs: 0,
  recastMs: recastS * 1000,
  charges: 1,
  mpCost: 0,
  cooldownGroup: id,
  range: 0,
  radius: 0,
  effects: [],
  traits: [],
  ...extra,
});
const at = (action: number, s: number): LegalityCast => ({ action, at: s * 1000, source: 'plan' });
const byIdOf = (actions: CatalogAction[]) => new Map(actions.map((a) => [a.id, a]));

describe('recastsShort', () => {
  it('brings charges back one at a time, a recast apart', () => {
    const tetra = action(3570, 'Tetragrammaton', 60, { charges: 2 });
    const casts = [at(3570, 0), at(3570, 1), at(3570, 60), at(3570, 61)];
    // At 60s one charge is back (the first's); the second comes back at 120s, not 61s.
    const short = recastsShort(casts, byIdOf([tetra]), [tetra]);
    expect(short.map((l) => l.cast.at)).toEqual([61_000]);
    expect(short[0]).toMatchObject({ rule: 'recast', needs: "Tetragrammaton's recast" });
  });

  it('takes off what a tooltip or a trait says another cast takes off', () => {
    const infuriate = action(52, 'Infuriate', 60, { jobs: ['WAR'] });
    const chaos = action(16465, 'Inner Chaos', 0, {
      jobs: ['WAR'],
      gcd: true,
      description: 'Additional Effect: Reduces the recast time of Infuriate by 5 seconds',
    });
    const cleave = action(3549, 'Fell Cleave', 0, { jobs: ['WAR'], gcd: true });
    const mine = [infuriate, chaos, cleave];
    // 60s less 5 (Inner Chaos) less 5 (Fell Cleave, Enhanced Infuriate): back at 50s.
    const casts = [at(52, 0), at(16465, 10), at(3549, 20), at(52, 50)];
    expect(recastsShort(casts, byIdOf(mine), mine)).toEqual([]);
    expect(recastsShort([at(52, 0), at(52, 50)], byIdOf(mine), mine)).toHaveLength(1);
  });

  it("reads a cut of two actions, and gives an upgrade's cut to what it replaces below its level", () => {
    const blazing = action(36978, 'Blazing Shot', 0, {
      jobs: ['MCH'],
      gcd: true,
      description: 'Additional Effect: Reduces the recast time of both Double Check and Checkmate by 15s',
    });
    const gauss = action(2874, 'Gauss Round', 30, { jobs: ['MCH'], charges: 3 });
    const ricochet = action(2890, 'Ricochet', 30, { jobs: ['MCH'], charges: 3 });
    // Level 80: no Double Check or Checkmate, so Blazing Shot brings Gauss Round and Ricochet back sooner.
    const mine = [blazing, gauss, ricochet];
    const spent = [0, 1, 2].flatMap((s) => [at(2874, s), at(2890, s)]);
    const casts = [...spent, at(36978, 3), at(36978, 5), at(2874, 15), at(2890, 15)];
    expect(recastsShort(casts, byIdOf(mine), mine)).toEqual([]);
    expect(recastsShort([...spent, at(2874, 15)], byIdOf(mine), mine)).toHaveLength(1);
  });

  it('leaves out GCDs with no cooldown of their own', () => {
    const broil = action(25865, 'Broil IV', 2.5, { gcd: true });
    expect(recastsShort([at(25865, 0), at(25865, 2.4)], byIdOf([broil]), [broil])).toEqual([]);
  });
});

describe('enablersMissing', () => {
  const chain = action(7436, 'Chain Stratagem', 120, {
    description: 'Additional Effect: Grants Impact Imminent\nDuration: 30s',
  });
  const baneful = action(37012, 'Baneful Impaction', 1, {
    description: 'Can only be executed while under the effect of Impact Imminent.',
  });
  const mine = [chain, baneful];

  it('needs the status a cast of the column granted in time', () => {
    expect(enablersMissing([at(7436, 0), at(37012, 2)], mine, byIdOf(mine))).toEqual([]);
    const late = enablersMissing([at(7436, 0), at(37012, 31)], mine, byIdOf(mine));
    expect(late).toEqual([{ cast: at(37012, 31), rule: 'enabler', needs: 'impact imminent' }]);
  });

  it("keeps a black mage's element until a cast grants the other, Transpose swapping them", () => {
    const blm = (id: number, name: string, description: string) =>
      action(id, name, 2.5, { jobs: ['BLM'], gcd: true, description });
    const fire3 = blm(152, 'Fire III', 'Additional Effect: Grants Astral Fire III and removes Umbral Ice');
    const blizzard3 = blm(154, 'Blizzard III', 'Additional Effect: Grants Umbral Ice III and removes Astral Fire');
    const fire4 = blm(3577, 'Fire IV', 'Can only be executed while under the effect of Astral Fire.');
    const transpose = blm(
      149,
      'Transpose',
      'Swaps Astral Fire with a single Umbral Ice, or Umbral Ice with a single Astral Fire.',
    );
    const mine = [fire3, blizzard3, fire4, transpose];
    // A Fire IV long after Fire III: no timer. After Blizzard III or a Transpose out of fire, none.
    const casts = [
      at(152, 0),
      at(3577, 100),
      at(154, 110),
      at(3577, 112),
      at(149, 114),
      at(3577, 115),
      at(149, 116),
      at(3577, 117),
    ];
    expect(enablersMissing(casts, mine, byIdOf(mine)).map((l) => l.cast.at)).toEqual([112_000, 117_000]);
    // Unknown at the pull (the log may start in fire): no flag.
    expect(enablersMissing([at(3577, 1)], mine, byIdOf(mine))).toEqual([]);
  });

  it('blooms the Blood Lily once at the pull, then after 3 lilies spent', () => {
    const misery = action(16535, 'Afflatus Misery', 0, { jobs: ['WHM'], gcd: true });
    const rapture = action(16534, 'Afflatus Rapture', 0, { jobs: ['WHM'], gcd: true });
    const whm = [misery, rapture];
    const casts = [at(16535, 5), at(16534, 10), at(16534, 30), at(16535, 40)];
    expect(enablersMissing(casts, whm, byIdOf(whm))).toEqual([
      { cast: at(16535, 40), rule: 'blood lily', needs: '3 lilies spent' },
    ]);
  });
});

describe('poolsShort', () => {
  it('spends Addersgall that comes back one every 20s, and one more from Rhizomata', () => {
    // Full (3) at the pull: the fourth has none until 20s, unless Rhizomata adds one.
    expect(poolsShort([at(24296, 1), at(24296, 2), at(24296, 3), at(24296, 4)])).toHaveLength(1);
    expect(poolsShort([at(24296, 1), at(24296, 2), at(24296, 3), at(24296, 21)])).toEqual([]);
    expect(poolsShort([at(24296, 1), at(24296, 2), at(24296, 3), at(24309, 3.5), at(24296, 4)])).toEqual([]);
  });
});

describe('aetherflowShort', () => {
  it('spends the 3 stacks each Aetherflow gives, Recitation making one free', () => {
    const spends = [at(166, 0), at(167, 1), at(188, 2), at(189, 3), at(167, 4)];
    expect(aetherflowShort(spends, 0).map((l) => l.cast.at)).toEqual([4_000]);
    const recited = [at(166, 0), at(16542, 1), at(3583, 2), at(167, 3), at(188, 4), at(189, 5)];
    expect(aetherflowShort(recited, 0)).toEqual([]);
  });

  it('starts with the fewest stacks the log needs', () => {
    expect(aetherflowAtPull([at(167, 1), at(166, 2)])).toBe(1);
    expect(aetherflowAtPull([at(166, 1), at(167, 2)])).toBe(0);
  });
});
