import { pairingsFor } from './paired-heals';
import { HealPairing, HealTool, PlannedUse } from './plan.model';
import { Weaving } from './weaving';

describe('pairingsFor', () => {
  // A sage's Zoe (50% on the next GCD heal, in 30s) and Pneuma, a 1.5s cast
  // at 60s healing two members as it lands.
  const zoe: HealPairing = {
    player: 2,
    action: 24300,
    name: 'Zoe',
    recastMs: 90_000,
    charges: 1,
    group: '2:zoe',
    heals: [24318],
    withinMs: 30_000,
    times: 1.5,
    extra: null,
    barriers: {},
  };
  const pneuma = { player: 2, action: 24318, gcd: true, castMs: 1500, effects: [] } as unknown as HealTool;
  const use: PlannedUse = { player: 2, action: 24318, name: 'Pneuma', at: 60_000, target: null, covers: [3] };
  const events = [
    { at: 61_500, player: 1, amount: 60_000 },
    { at: 61_500, player: 3, amount: 60_000 },
  ];
  const pair = (pairing: HealPairing, used: number[] = []) =>
    pairingsFor([pairing], pneuma, use, events, [], () => used, new Weaving(), new Map());

  it('puts it up in the weave slot before the cast, and makes the heal bigger', () => {
    const [paired] = pair(zoe);

    expect(paired.use).toMatchObject({ player: 2, action: 24300, name: 'Zoe', at: 59_999, covers: [3] });
    expect(paired.events.map((e) => e.amount)).toEqual([90_000, 90_000]);
  });

  it('adds what each member the heal reaches gets on top (Confession)', () => {
    const [paired] = pair({ ...zoe, times: 1, extra: { hp: 20_000 } });

    expect(paired.events).toContainEqual({ at: 61_500, player: 3, amount: 20_000 });
    expect(paired.events).toHaveLength(4);
  });

  it('leaves a barrier of its share of what the heal heals, as a shield for 30s', () => {
    const [paired] = pair({ ...zoe, name: 'Neutral Sect', action: 16559, times: 1.2, barriers: { 24318: 2.5 } });

    expect(paired.barrier?.use).toMatchObject({ player: 2, action: -16559, at: 61_500 });
    expect(paired.barrier?.tool.effects).toEqual([
      expect.objectContaining({ target: 'target', shield: { hp: 180_000 }, durationMs: 30_000, hits: 1 }),
    ]);
    expect(pair(zoe)[0].barrier).toBeNull();
  });

  it('needs its recast, and a heal it goes with', () => {
    expect(pair(zoe, [40_000])).toEqual([]);
    expect(pair({ ...zoe, heals: [124] })).toEqual([]);
  });
});
