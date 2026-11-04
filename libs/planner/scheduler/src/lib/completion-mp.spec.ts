import type { PullTimeline } from '@everise/core/api-types';
import { mpPastWipePoint } from './completion-mp';
import { catalog, pull } from './scheduler-fixtures';

// The paladin (1), 10,000 MP at most, ticking 200 MP: at 4,000 by 30 s.
function wipe(deaths: number[] = [], acts: number[] = []): PullTimeline {
  const base = pull([]);
  const mp = [
    { at: 0, mp: 3_600 },
    { at: 3_000, mp: 3_800 },
    { at: 30_000, mp: 4_000 },
  ];
  return {
    ...base,
    players: base.players.map((p) => (p.id === 1 ? { ...p, maxMp: 10_000, mp } : p)),
    deaths: deaths.map((s) => ({ at: s * 1000, player: 1, action: null, source: null })),
    playerCasts: acts.map((s) => ({ at: s * 1000, source: 1, target: null, action: 7531, castMs: null })),
  };
}
const paladin = (t: PullTimeline) => t.players[0];

describe('mpPastWipePoint', () => {
  it('goes on from where their MP stood at the wipe point, back to the max at their tick', () => {
    const t = wipe();
    const readings = mpPastWipePoint(t, paladin(t), 40_000, 200_000, catalog());

    expect(readings[0]).toEqual({ at: 40_001, mp: 4_000 });
    expect(readings[1]).toEqual({ at: 43_000, mp: 4_200 });
    expect(readings.at(-1)).toEqual({ at: 130_000, mp: 10_000 });
  });

  it('starts one lying dead at the wipe point from their MP before they died', () => {
    // Read at 0 once dead, at 35 s.
    const t = wipe([35]);
    t.players[0].mp.push({ at: 35_000, mp: 0 });

    expect(mpPastWipePoint(t, paladin(t), 40_000, 200_000, catalog()).slice(0, 2)).toEqual([
      { at: 40_001, mp: 4_000 },
      { at: 43_000, mp: 4_200 },
    ]);
  });

  it('goes on from their MP for one raised before the wipe point', () => {
    const t = wipe([20], [25]);

    expect(mpPastWipePoint(t, paladin(t), 40_000, 200_000, catalog())[0]).toEqual({ at: 40_001, mp: 4_000 });
  });

  it('spends what their damage spells cost at their own pace, from their GCDs before the wipe point', () => {
    // A 400 MP spell every 2.5 s up to 30 s, and a GCD heal (spending none of theirs).
    const spell = { ...catalog().actions[0], id: 9001, name: 'Glare III', gcd: true, mpCost: 400, effects: [] };
    const withSpell = {
      ...catalog(),
      actions: [...catalog().actions, { ...spell, description: 'Deals unaspected damage.' }],
    };
    const t = wipe();
    t.playerCasts = Array.from({ length: 13 }, (_, i) => ({
      at: i * 2_500,
      source: 1,
      target: null,
      action: 9001,
      castMs: null,
    }));
    const readings = mpPastWipePoint(t, paladin(t), 40_000, 50_000, withSpell);

    expect(readings.slice(0, 5)).toEqual([
      { at: 40_001, mp: 4_000 },
      { at: 42_500, mp: 3_600 },
      { at: 43_000, mp: 3_800 },
      { at: 45_000, mp: 3_400 },
      { at: 46_000, mp: 3_600 },
    ]);
  });
});
