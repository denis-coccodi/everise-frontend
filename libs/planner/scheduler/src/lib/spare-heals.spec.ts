import { HealTool, Mechanic } from './plan.model';
import { aimedHeals, spareHeals } from './spare-heals';
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

describe('aimedHeals', () => {
  const star = {
    player: 2,
    action: 7439,
    name: 'Earthly Star',
    recastMs: 60_000,
    charges: 1,
    gcd: false,
    castMs: 0,
    group: '2:star',
    pool: null,
    cost: 'free',
    effects: [{ target: 'party' }],
    delayed: { delaysMs: [20_000, 10_000] },
  } as unknown as HealTool;
  const raidwide = (id: number, s: number, unmitigated: number) =>
    ({
      id,
      at: s * 1000,
      kind: 'raidwide',
      hits: [{ player: 1, unmitigated, avoidable: false }],
    }) as unknown as Mechanic;

  it('places it on cooldown to go off grown just before the heaviest raidwide within a minute', () => {
    const delays: number[] = [];
    const { uses } = aimedHeals(
      [star],
      [],
      new Weaving(),
      (_tool, _use, delayMs) => {
        delays.push(delayMs);
        return [];
      },
      [raidwide(1, 30, 10_000), raidwide(2, 50, 90_000), raidwide(3, 150, 50_000)],
    );

    expect(uses.map((u) => u.at)).toEqual([29_000, 129_000]);
    expect(delays).toEqual([20_000, 20_000]);
  });

  it('waits for the next raidwide where its recast is still running', () => {
    const spent: Spent[] = [{ player: 2, action: 7439, at: 0, group: '2:star', pool: null, gcd: false, castMs: 0 }];
    const { uses } = aimedHeals([star], spent, new Weaving(), () => [], [
      raidwide(1, 50, 90_000),
      raidwide(2, 100, 90_000),
    ]);

    expect(uses.map((u) => u.at)).toEqual([79_000]);
  });

  it("casts a sage's Pneuma, a GCD, just before the heaviest raidwide, on cooldown", () => {
    const pneuma = {
      ...star,
      action: 24318,
      name: 'Pneuma',
      recastMs: 120_000,
      gcd: true,
      castMs: 1_500,
      group: '2:pneuma',
      delayed: null,
    } as unknown as HealTool;
    const { uses } = aimedHeals([pneuma], [], new Weaving(), () => [], [
      raidwide(1, 50, 90_000),
      raidwide(2, 200, 90_000),
    ]);

    expect(uses.map((u) => [u.name, u.at])).toEqual([
      ['Pneuma', 47_500],
      ['Pneuma', 197_500],
    ]);
  });
});
