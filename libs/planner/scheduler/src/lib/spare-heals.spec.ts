import { HealTool } from './plan.model';
import { spareHeals } from './spare-heals';
import { Weaving } from './weaving';
import type { Spent } from './heal-plan.model';

describe('spareHeals', () => {
  const assize = {
    player: 2,
    action: 3571,
    name: 'Assize',
    recastMs: 40_000,
    charges: 1,
    gcd: false,
    castMs: 0,
    group: '2:assize',
    pool: null,
    cost: 'free',
    effects: [],
  } as unknown as HealTool;
  const run = (spent: Spent[] = []) =>
    spareHeals(
      [assize],
      spent,
      new Weaving(),
      130_000,
      () => 'dps',
      () => [],
    ).uses.map((u) => u.at);

  it('uses a heal that goes on cooldown as often as its recast allows', () => {
    expect(run()).toEqual([0, 40_000, 80_000, 120_000]);
  });

  it("uses both of Seraph's Consolations before she leaves", () => {
    const consolation = {
      ...assize,
      action: 16546,
      name: 'Consolation',
      recastMs: 30_000,
      charges: 2,
      group: '2:consolation',
      grantedBy: { action: 16545, withinMs: 22_000, uses: 2 },
    } as unknown as HealTool;
    const seraph: Spent = {
      player: 2,
      action: 16545,
      at: 10_000,
      group: '2:seraph',
      pool: null,
      gcd: false,
      castMs: 0,
    };
    const one: Spent = {
      player: 2,
      action: 16546,
      at: 15_000,
      group: '2:consolation',
      pool: null,
      gcd: false,
      castMs: 0,
    };
    const spent = [seraph, one];

    const uses = spareHeals(
      [consolation],
      spent,
      new Weaving(),
      130_000,
      () => 'dps',
      () => [],
    ).uses;

    // The hits needed one at 15s: the other goes in the weave slot after
    // Summon Seraph's.
    expect(uses.map((u) => [u.name, u.at])).toEqual([['Consolation', 10_700]]);
  });

  it('fits around the uses the hits needed', () => {
    const used: Spent = { player: 2, action: 3571, at: 50_000, group: '2:assize', pool: null, gcd: false, castMs: 0 };

    expect(run([used])).toEqual([0, 90_000]);
  });
});
