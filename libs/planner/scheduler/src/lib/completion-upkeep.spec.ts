import type { PullTimeline } from '@everise/core/api-types';
import { withUpkeep } from './completion-upkeep';
import { action, catalog, pull } from './scheduler-fixtures';

// The scholar (2) with Aetherflow (60 s) at 10 s and Chain Stratagem (120 s)
// at 7 s, an Energy Drain at 12 s and a Sacred Soil at 20 s; the log ends
// at 100 s, completed to 300 s.
function wiped(): PullTimeline {
  const cast = (at: number, a: number) => ({ at: at * 1000, source: 2, target: null, action: a, castMs: null });
  return {
    ...pull([]),
    durationMs: 300_000,
    playerCasts: [cast(7, 7436), cast(10, 166), cast(12, 167), cast(20, 188)],
  };
}
const cat = () => {
  const c = catalog();
  c.actions.push(
    { ...action(166, 'Aetherflow', ['SCH'], 60, []), effects: [] },
    action(7436, 'Chain Stratagem', ['SCH'], 120, []),
    { ...action(167, 'Energy Drain', ['SCH'], 1, []), description: 'Deals unaspected damage.' },
  );
  return c;
};
const added = (t: PullTimeline) => t.playerCasts.filter((c) => c.at > 100_000).map((c) => [c.action, c.at / 1000]);

describe('withUpkeep', () => {
  it("keeps a late player's buffs and Aetherflow on cooldown past their start, not their heals or attacks", () => {
    const t = withUpkeep(wiped(), new Map([[2, 100_000]]), cat());

    expect(added(t)).toEqual(
      [
        [7436, 127],
        [166, 130],
        [166, 190],
        [7436, 247],
        [166, 250],
        // Lucid Dreaming a few seconds in, then each minute: a healer's.
        [7562, 103],
        [7562, 163],
        [7562, 223],
        [7562, 283],
      ].sort((a, b) => a[1] - b[1]),
    );
  });

  it('adds nothing without late players', () => {
    const t = wiped();
    expect(withUpkeep(t, new Map(), cat())).toBe(t);
  });
});
