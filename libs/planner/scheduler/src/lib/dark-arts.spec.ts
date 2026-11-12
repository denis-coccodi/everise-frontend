import { BLACKEST_NIGHT, blackestNightBreaks } from './dark-arts';
import { MpModel } from './mp';
import { action, catalog, heal, pull } from './scheduler-fixtures';
import type { PullTimeline } from '@everise/core/api-types';

// The Blackest Night as the catalog has it: a shield of 25% of the target's
// max HP for 7s, for 3,000 MP.
function withBlackestNight() {
  const c = catalog();
  const shield = { ...heal(0), kind: 'shield' as const, potency: null, percent: 25, of: 'maxHp' as const };
  c.actions.push(
    action(BLACKEST_NIGHT, 'The Blackest Night', ['DRK'], 15, [{ ...shield, durationMs: 7_000 }], { mpCost: 3_000 }),
  );
  return c;
}

// The paladin (1, 100,000 HP) as a Dark Knight logged at 4,000 MP
// throughout, unless the readings say otherwise; an auto-attack of 30,000
// at 31s (more than the shield's 25,000).
function darkKnight(readings: [number, number][] = [[0, 4_000]], casts: PullTimeline['playerCasts'] = []) {
  const timeline = pull([[31, 'Attack', 1, 30_000]]);
  timeline.players = timeline.players.map((p) =>
    p.id === 1
      ? {
          ...p,
          job: 'DRK',
          maxMp: 10_000,
          mp: [...readings, [60, readings.at(-1)?.[1] ?? 0]].map(([s, mp]) => ({ at: s * 1000, mp })),
        }
      : p,
  );
  timeline.playerCasts = casts;
  return timeline;
}

describe('The Blackest Night breaking', () => {
  it('breaks once its target has taken a quarter of their max HP in its 7s', () => {
    const timeline = darkKnight();
    timeline.damage.push({ ...timeline.damage[0], at: 45_000, amount: 15_000, absorbed: 15_000 });
    const breaks = blackestNightBreaks(timeline, withBlackestNight());

    expect(breaks(1, 30_000)).toBe(31_000);
    // Absorbed damage counts too.
    expect(breaks(1, 40_000)).toBe(45_000);
    // The hit lands after it's gone, or on someone else.
    expect(breaks(1, 20_000)).toBeNull();
    expect(breaks(2, 30_000)).toBeNull();
  });
});

describe("a Dark Knight's MP with The Blackest Night", () => {
  it('gives the MP back when it breaks (Dark Arts makes the next Edge free)', () => {
    const mp = MpModel.of(darkKnight(), withBlackestNight(), [1], new Set());

    const curve = mp.curve(1, [{ action: BLACKEST_NIGHT, at: 30_000, target: 1 }]);
    expect(curve.find((c) => c.at === 30_000)?.mp).toBe(1_000);
    expect(curve.find((c) => c.at === 31_000)?.mp).toBe(4_000);
    // So another fits right after it: the 4,000 are back.
    expect(mp.affordable(1, BLACKEST_NIGHT, 32_000, [{ action: BLACKEST_NIGHT, at: 30_000, target: 1 }])).toBe(true);
  });

  it("never spends MP for spare margin on one that won't break: that costs an Edge", () => {
    const mp = MpModel.of(darkKnight(), withBlackestNight(), [1], new Set());

    expect(mp.affordable(1, BLACKEST_NIGHT, 30_000, [], 'spare', 1)).toBe(true);
    expect(mp.affordable(1, BLACKEST_NIGHT, 50_000, [], 'spare', 1)).toBe(false);
    // Where it's needed, it may.
    expect(mp.affordable(1, BLACKEST_NIGHT, 50_000, [], 'need', 1)).toBe(true);
    expect(mp.refused).toEqual([]);
  });

  it('needs the MP only as it goes up, for the autos: what breaks gives it back', () => {
    // 4,000 until 40s, then 2,000: the full cost would run them out then.
    const timeline = darkKnight([
      [0, 4_000],
      [40, 2_000],
    ]);
    const mp = MpModel.of(timeline, withBlackestNight(), [1], new Set());

    expect(mp.affordable(1, BLACKEST_NIGHT, 30_000, [], 'spare', 1)).toBe(false);
    expect(mp.affordable(1, BLACKEST_NIGHT, 30_000, [], 'upkeep', 1)).toBe(true);
    // One that won't break costs an Edge: not for the autos either.
    expect(mp.affordable(1, BLACKEST_NIGHT, 10_000, [], 'upkeep', 1)).toBe(false);
  });

  it('gives nothing back for one played that broke: its Edge, free as played, costs MP without it', () => {
    // Played at 30s (4,000 down to 1,000); the Edge it made free left the MP as it was.
    const timeline = darkKnight(
      [
        [0, 4_000],
        [30.5, 1_000],
      ],
      [{ at: 30_000, source: 1, target: 1, action: BLACKEST_NIGHT, castMs: null }],
    );
    const mp = MpModel.of(timeline, withBlackestNight(), [1], new Set([`1:${BLACKEST_NIGHT}`]));

    expect(mp.curve(1, []).at(-1)?.mp).toBe(1_000);
  });
});
