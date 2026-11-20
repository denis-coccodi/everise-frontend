import { pairingsFor } from './paired-heals';
import { HealPairing, HealTool, Mechanic, PlannedUse } from './plan.model';
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
    shields: false,
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

  it("puts Synastry's bond on the shortest other member, never on the astrologian", () => {
    const benefic = { player: 2, action: 3594, gcd: true, castMs: 1500, effects: [] } as unknown as HealTool;
    const synastry = { ...zoe, action: 3612, name: 'Synastry', heals: [3594], withinMs: 20_000, times: 1, bond: 0.4 };
    const onSelf = { ...use, action: 3594, name: 'Benefic II', target: 2 };
    const selfEvents = [{ at: 61_500, player: 2, amount: 50_000 }];
    const bondFor = (short: Map<number, number>) =>
      pairingsFor([synastry], benefic, onSelf, selfEvents, [], () => [], new Weaving(), new Map(), undefined, short);

    // The astrologian is the shortest, but the bond goes to the next one.
    const [paired] = bondFor(
      new Map([
        [2, 90_000],
        [3, 40_000],
      ]),
    );
    expect(paired.use.target).toBe(3);
    expect(paired.events).toContainEqual({ at: 61_500, player: 3, amount: 20_000 });

    // Nobody else short, and the heal is on the astrologian: no Synastry.
    expect(bondFor(new Map([[2, 90_000]]))).toEqual([]);
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

describe('pairingsFor in a window already up', () => {
  // An astrologian's Neutral Sect (its barrier 125% of what a Helios Conjunction heals each member).
  const sect: HealPairing = {
    player: 2,
    action: 16559,
    name: 'Neutral Sect',
    recastMs: 120_000,
    charges: 1,
    group: '2:sect',
    heals: [37030],
    withinMs: 20_000,
    times: 1.2,
    extra: null,
    barriers: { 37030: 1.25 },
    onTarget: false,
    own: false,
    converts: false,
    shields: false,
    bond: 0,
  };
  const helios = {
    player: 2,
    action: 37030,
    gcd: true,
    castMs: 1500,
    effects: [{ target: 'party' }],
  } as unknown as HealTool;
  const cast = (at: number): PlannedUse => ({
    player: 2,
    action: 37030,
    name: 'Helios Conjunction',
    at,
    target: null,
    covers: [],
  });
  const healed = (at: number) => [1, 3].map((player) => ({ at: at + 1500, player, amount: 10_000 }));

  it('leaves its barrier with the heal, pressing nothing new, the heal as it is', () => {
    const [paired] = pairingsFor(
      [sect],
      helios,
      cast(15_000),
      healed(15_000),
      [],
      () => [10_000],
      new Weaving(),
      new Map(),
    );

    expect(paired.open).toBe(true);
    expect(paired.use).toMatchObject({ action: 16559, at: 10_000 });
    expect(paired.events.map((e) => e.amount)).toEqual([10_000, 10_000]);
    expect(paired.barrier?.tool.effects[0].shield).toEqual({ hp: 12_500 });
  });

  it('gives that barrier to the heal with Horoscope too: one Helios sets off both', () => {
    const horoscope: HealPairing = {
      ...sect,
      action: 16557,
      name: 'Horoscope',
      group: '2:horoscope',
      recastMs: 60_000,
      withinMs: 30_000,
      times: 1,
      barriers: {},
    };

    const found = pairingsFor(
      [sect, horoscope],
      helios,
      cast(15_000),
      healed(15_000),
      [],
      (group) => (group === '2:sect' ? [10_000] : []),
      new Weaving(),
      new Map(),
    );
    const withHoroscope = found.find((p) => p.pairing.name === 'Horoscope');

    expect(withHoroscope?.open).toBeFalsy();
    expect(withHoroscope?.barrier?.tool.effects[0].shield).toEqual({ hp: 12_500 });
  });

  it('reads Horoscope Helios as the Helios lands, or right after the next hit on those it reached', () => {
    // Horoscope before the Helios at 15s (landing at 16.5s on players 1 and 3), 20,000 on top each when read.
    const horoscope: HealPairing = {
      ...sect,
      action: 16557,
      name: 'Horoscope',
      group: '2:horoscope',
      recastMs: 60_000,
      withinMs: 10_000,
      times: 1,
      extra: { hp: 20_000 },
      barriers: {},
    };
    const hit = (id: number, at: number, players: number[]) =>
      ({ id, at, hits: players.map((player) => ({ player, avoidable: false })) }) as unknown as Mechanic;
    const read = (mechanics: Mechanic[]) =>
      pairingsFor(
        [horoscope],
        helios,
        cast(15_000),
        healed(15_000),
        [],
        () => [],
        new Weaving(),
        new Map(),
        undefined,
        undefined,
        mechanics,
      ).map((p) => [p.readAt, p.events.filter((e) => e.amount === 20_000).map((e) => e.at)]);

    // A hit on someone else at 20s doesn't count; the raidwide at 25s does: read a second after it.
    expect(read([hit(1, 20_000, [2]), hit(2, 25_000, [1, 3])])).toEqual([
      [16_500, [16_500, 16_500]],
      [26_000, [26_000, 26_000]],
    ]);
    // With no hit in its 30s, it heals as it runs out.
    expect(read([]).map(([at]) => at)).toEqual([16_500, 46_500]);
  });
});
