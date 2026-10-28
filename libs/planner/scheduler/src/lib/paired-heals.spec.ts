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
    onTarget: false,
    own: false,
    converts: false,
    bond: 0,
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

    // A weave before the cast, which takes its own slot.
    expect(paired.use).toMatchObject({ player: 2, action: 24300, name: 'Zoe', at: 59_300, covers: [3] });
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

  it('puts Krasis on the member an oGCD heal is for, and makes only their heal bigger', () => {
    const druochole = { player: 2, action: 24296, gcd: false, castMs: 0, effects: [] } as unknown as HealTool;
    const krasis = {
      ...zoe,
      action: 24317,
      name: 'Krasis',
      heals: [24296],
      withinMs: 10_000,
      times: 1.2,
      onTarget: true,
    };
    const heal = { ...use, action: 24296, name: 'Druochole', target: 1 };
    const healEvents = [
      { at: 60_000, player: 1, amount: 60_000 },
      { at: 60_000, player: 3, amount: 60_000 },
    ];

    const [paired] = pairingsFor([krasis], druochole, heal, healEvents, [], () => [], new Weaving(), new Map());

    expect(paired.use).toMatchObject({ name: 'Krasis', target: 1, at: 59_300 });
    expect(paired.events.map((e) => e.amount)).toEqual([72_000, 60_000]);
  });

  it('brings its own healing with it (Physis II), and makes the heal after it bigger', () => {
    const physis = {
      ...zoe,
      action: 24302,
      name: 'Physis II',
      heals: [24318],
      withinMs: 15_000,
      times: 1.1,
      own: true,
      converts: false,
      bond: 0,
    };
    const regen = (paired: PlannedUse) => [{ at: paired.at + 3000, player: 1, amount: 13_000 }];

    const [paired] = pairingsFor(
      [physis],
      pneuma,
      use,
      events,
      [],
      () => [],
      new Weaving(),
      new Map(),
      (_, u) => regen(u),
    );

    expect(paired.events.map((e) => [e.at, e.amount])).toEqual([
      [61_500, 66_000],
      [61_500, 66_000],
      [62_300, 13_000],
    ]);
  });

  it('needs its recast, and a heal it goes with', () => {
    expect(pair(zoe, [40_000])).toEqual([]);
    expect(pair({ ...zoe, heals: [124] })).toEqual([]);
  });
});
