import { ActionEffect } from '@everise/core/api-types';
import { LUCID_DREAMING, lucidTimes } from './lucid';
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
});
