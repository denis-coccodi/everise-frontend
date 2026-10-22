import { delayedEvents } from './delayed-heals';
import { HpTrack } from './hp-track';
import { DelayedHeal, HealTool, PlannedUse } from './plan.model';

describe('delayedEvents', () => {
  const maxHp = new Map([
    [1, 100_000],
    [2, 100_000],
  ]);
  const tool = (delayed: Partial<DelayedHeal>, target: 'target' | 'party' = 'target'): HealTool => ({
    player: 2,
    action: 1,
    name: 'Heal',
    recastMs: 60_000,
    charges: 1,
    gcd: false,
    castMs: 0,
    group: '2:1',
    pool: null,
    effects: [{ target, size: { hp: 10_000 }, ticks: 1, status: null, statusId: null }],
    delayed: {
      delaysMs: [15_000],
      release: null,
      belowShare: null,
      damageShare: null,
      stacks: null,
      loggedAs: 'Heal',
      ...delayed,
    },
  });
  const use: PlannedUse = { player: 2, action: 1, name: 'Heal', at: 10_000, target: 1, covers: [] };
  // The tank is hit at 12s and 14s, the healer at 20s; 40,000 each.
  const hits = new Map([
    [1, [12_000, 14_000]],
    [2, [20_000]],
  ]);
  const hitTimes = (player: number, from: number, to: number) =>
    (hits.get(player) ?? []).filter((at) => at > from && at <= to);
  const track = new HpTrack(
    maxHp,
    [...hits].flatMap(([player, times]) => times.map((at) => ({ at, player, amount: -40_000 }))),
  );
  const events = (t: HealTool) => delayedEvents(t, use, 15_000, [1, 2], maxHp, track, hitTimes);

  it('goes off when the target first drops to its share, or when it ends', () => {
    // 20,000 left after the second hit: below half.
    expect(events(tool({ belowShare: 0.5 }))).toEqual([{ at: 14_000, player: 1, amount: 10_000 }]);
    expect(events(tool({ belowShare: 0.1 }))).toEqual([{ at: 25_000, player: 1, amount: 10_000 }]);
  });

  it("heals a barrier's stacks left: two of five used up by the target's hits", () => {
    const haima = tool({ stacks: { count: 5, holder: 'target', perHit: null } });

    expect(events(haima)).toEqual([{ at: 25_000, player: 1, amount: 30_000 }]);
  });

  it("heals each player for their own stacks left, and the party on each of the user's hits", () => {
    const panhaima = tool({ stacks: { count: 5, holder: 'party', perHit: null } }, 'party');
    const liturgy = tool({ stacks: { count: 5, holder: 'self', perHit: { hp: 40_000 } } }, 'party');

    expect(events(panhaima)).toEqual([
      { at: 25_000, player: 1, amount: 30_000 },
      { at: 25_000, player: 2, amount: 40_000 },
    ]);
    // The white mage (the user, player 2) is hit once: a 40,000 heal for the
    // party then, four stacks left at the end.
    expect(events(liturgy)).toEqual([
      { at: 25_000, player: 1, amount: 40_000 },
      { at: 25_000, player: 2, amount: 40_000 },
      { at: 20_000, player: 1, amount: 40_000 },
      { at: 20_000, player: 2, amount: 40_000 },
    ]);
  });

  it('adds its share of the damage taken meanwhile when it ends', () => {
    const macrocosmos = tool({ damageShare: 0.5 }, 'party');

    expect(events(macrocosmos)).toEqual([
      { at: 25_000, player: 1, amount: 50_000 },
      { at: 25_000, player: 2, amount: 30_000 },
    ]);
  });

  it('lands any other delayed heal its delay after it lands', () => {
    expect(events(tool({}))).toEqual([{ at: 25_000, player: 1, amount: 10_000 }]);
  });
});
