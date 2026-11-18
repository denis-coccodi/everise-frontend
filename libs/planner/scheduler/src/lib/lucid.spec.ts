import { ActionEffect, TimelineCast } from '@everise/core/api-types';
import { LUCID_DREAMING, lucidCast, lucidTimes, lucidUse } from './lucid';
import { MpModel } from './mp';
import { action, catalog, pull } from './scheduler-fixtures';
import { Weaving } from './weaving';

const ADLOQUIUM = 185;

describe("a replanned healer's Lucid Dreaming", () => {
  it('goes up once their MP with the plan drops below 8,000, in the next weave slot', () => {
    // The scholar (2) logged at full MP all along.
    const timeline = pull([]);
    timeline.playerCasts = [];
    timeline.players = timeline.players.map((p) =>
      p.id === 2
        ? {
            ...p,
            maxMp: 10_000,
            mp: Array.from({ length: 61 }, (_, i) => ({ at: i * 3_000, mp: 10_000 - (i % 2) })),
          }
        : p,
    );
    const c = catalog();
    c.actions = c.actions.map((a) => (a.id === ADLOQUIUM ? { ...a, mpCost: 900 } : a));
    const regen = { kind: 'mpRegen', target: 'self', potency: 55, durationMs: 21_000 } as ActionEffect;
    c.actions.push(action(LUCID_DREAMING, 'Lucid Dreaming', ['SCH'], 60, [regen]));
    const mp = MpModel.of(timeline, c, [2], new Set());
    const byId = new Map(c.actions.map((a) => [a.id, a]));
    // Three Adloquiums at 10s, 11s, 12s: 7,300 MP left.
    const uses = [10_000, 11_000, 12_000].map((at) => ({
      player: 2,
      action: ADLOQUIUM,
      name: 'Adloquium',
      at,
      target: 1,
      covers: [],
    }));

    // After the third, in its weave slot.
    expect(lucidTimes(2, mp, uses, new Weaving(), byId, 180_000)).toEqual([12_600]);
    // Nothing spends: no Lucid.
    expect(lucidTimes(2, mp, [], new Weaving(), byId, 180_000)).toEqual([]);
  });

  it('counts, once placed, in the MP checks of the passes after (once, with it in their uses)', () => {
    const timeline = pull([]);
    timeline.playerCasts = [];
    timeline.players = timeline.players.map((p) =>
      p.id === 2
        ? { ...p, maxMp: 10_000, mp: Array.from({ length: 61 }, (_, i) => ({ at: i * 3_000, mp: 10_000 })) }
        : p,
    );
    const c = catalog();
    c.actions = c.actions.map((a) => (a.id === ADLOQUIUM ? { ...a, mpCost: 900 } : a));
    const regen = { kind: 'mpRegen', target: 'self', potency: 55, durationMs: 21_000 } as ActionEffect;
    c.actions.push(action(LUCID_DREAMING, 'Lucid Dreaming', ['SCH'], 60, [regen]));
    // The plan schedules both: the played ones are undone.
    const scheduled = new Set([`2:${ADLOQUIUM}`, `2:${LUCID_DREAMING}`]);
    // Eleven Adloquiums from 10s: 100 MP left.
    const uses = Array.from({ length: 11 }, (_, i) => ({
      player: 2,
      action: ADLOQUIUM,
      name: 'Adloquium',
      at: 10_000 + i * 100,
      target: 1,
      covers: [],
    }));
    const lucid = lucidUse(2, 11_000);
    const past = (fixed: TimelineCast[]) => ({ from: Infinity, fixed, unlogged: [], perGcd: new Map() });
    const without = MpModel.of(timeline, c, [2], scheduled, undefined, past([]));
    const placed = MpModel.of(timeline, c, [2], scheduled, undefined, past([lucidCast(lucid)]));

    // A twelfth at 20.5s: 733 MP without the Lucid, 2,383 with its three ticks.
    expect(without.affordable(2, ADLOQUIUM, 20_500, uses)).toBe(false);
    expect(placed.affordable(2, ADLOQUIUM, 20_500, uses)).toBe(true);
    expect(placed.shares(2, [...uses, lucid])(20_000)).toBeCloseTo(placed.shares(2, uses)(20_000));
  });
});
