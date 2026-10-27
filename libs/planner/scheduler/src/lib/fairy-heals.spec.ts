import { cutsUnion, fairyHeals, fairyPotency, fairyPower, withFairyAway } from './fairy-heals';
import { party, pull } from './scheduler-fixtures';

describe('fairyHeals', () => {
  // The scholar (2) and their faerie, whose first Embrace was at 1s.
  const timeline = () => {
    const t = pull([]);
    t.players = party();
    t.heals = [
      {
        at: 1_000,
        source: 2,
        pet: 'Selene',
        target: 1,
        action: 802,
        status: null,
        amount: 9_000,
        overheal: 0,
        tick: false,
        estimated: false,
        hp: null,
      },
    ];
    return t;
  };
  const maxHp = new Map(party().map((p) => [p.id, p.maxHp as number]));
  // The paladin down to 60% at 2s, the bard to 50% at 9s, both healed back
  // at 20s.
  const hp = [
    {
      player: 1,
      points: [
        { at: 0, hp: 100_000 },
        { at: 2_000, hp: 60_000 },
        { at: 20_000, hp: 100_000 },
      ],
    },
    { player: 2, points: [{ at: 0, hp: 100_000 }] },
    {
      player: 3,
      points: [
        { at: 0, hp: 100_000 },
        { at: 9_000, hp: 50_000 },
        { at: 20_000, hp: 100_000 },
      ],
    },
  ];

  it('heals every 3.2s whoever is missing the most of their HP, and no one at full HP', () => {
    const { events } = fairyHeals(timeline(), 2, 50, [], hp, maxHp, 180);

    expect(events.map((e) => [e.at, e.player, e.amount])).toEqual([
      [4_200, 1, 9_000],
      [7_400, 1, 9_000],
      [10_600, 3, 9_000],
      [13_800, 3, 9_000],
      [17_000, 3, 9_000],
    ]);
  });

  it('stops while Dissipation sends the fairy away, and Seraph heals while she is out', () => {
    const t = timeline();
    t.playerCasts = [{ at: 4_000, source: 2, target: null, action: 3587, castMs: null }];
    const seraph = [{ player: 2, action: 16545, name: 'Summon Seraph', at: 12_000, target: null, covers: [] }];

    const { events, casts } = fairyHeals(t, 2, 50, seraph, hp, maxHp, 180);

    // Away from 4s to 34s, but Seraph from 12s to 34s.
    expect(events.map((e) => e.at)).toEqual([13_800, 17_000]);
    // Seraph's casts are Seraphic Veils, for their barriers.
    expect(casts.map((c) => [c.at, c.action, c.target])).toEqual([
      [13_800, 16548, 3],
      [17_000, 16548, 3],
    ]);
  });

  it("measures the fairy's healing from her own heals, or the scholar's", () => {
    expect(fairyPower(timeline(), 2, 30, 180)).toBe(50);
    expect(fairyPower(pull([]), 2, 30, 180)).toBe(30);
    // 150 potency below level 85.
    expect(fairyPotency(84)).toBe(150);
    expect(fairyPotency(100)).toBe(180);
  });

  it("keeps the fairy's orders, Aetherpact and Seraphism out of Dissipation", () => {
    const t = timeline();
    t.playerCasts = [{ at: 60_000, source: 2, target: null, action: 3587, castMs: null }];
    const tools = withFairyAway(t, [
      { player: 2, action: 16537 }, // Whispering Dawn
      { player: 2, action: 7437 }, // Aetherpact
      { player: 2, action: 37014 }, // Seraphism
      { player: 2, action: 185 }, // Adloquium
    ]);

    expect(tools.map((x) => ('away' in x ? x.away : null))).toEqual([
      [{ from: 60_000, to: 90_000 }],
      [{ from: 60_000, to: 90_000 }],
      [{ from: 60_000, to: 90_000 }],
      null,
    ]);
  });
});

describe('cutsUnion', () => {
  // An Aetherpact at 10s (its union to 22s), a Whispering Dawn at 40s.
  const timesOf = (action: number) => ({ 7437: [10_000], 16537: [40_000] })[action as 7437 | 16537] ?? [];

  it('keeps fairy orders and Summon Seraph out of a union, and a union off an order coming', () => {
    expect(cutsUnion(16543, 15_000, timesOf)).toBe(true); // Fey Blessing in it
    expect(cutsUnion(16545, 21_000, timesOf)).toBe(true); // Summon Seraph
    expect(cutsUnion(16543, 22_000, timesOf)).toBe(false); // after its last tick
    expect(cutsUnion(7437, 30_000, timesOf)).toBe(true); // Whispering Dawn at 40s
    expect(cutsUnion(7437, 41_000, timesOf)).toBe(false);
    expect(cutsUnion(185, 15_000, timesOf)).toBe(false); // Adloquium
  });
});
