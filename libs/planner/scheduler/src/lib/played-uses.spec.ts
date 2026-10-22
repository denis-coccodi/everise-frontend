import { playedUses } from './played-uses';
import { catalog, pull } from './scheduler-fixtures';
import { mitigationTools } from './tools';

describe('playedUses', () => {
  it("gives the tools' uses as played, from when each landed, on whom it went", () => {
    const timeline = pull([]);
    const cast = (at: number, source: number, action: number, target: number | null, castMs: number | null = null) => ({
      at,
      source,
      target,
      action,
      castMs,
    });
    timeline.playerCasts = [
      cast(10_000, 1, 7531, 13),
      cast(20_000, 2, 185, 1, 1500),
      // Not a mitigation, and not one of these players' tools.
      cast(30_000, 1, 9, 13),
      cast(40_000, 3, 7405, null),
    ];
    const power = new Map([[2, 100]]);
    const tools = mitigationTools(timeline.players, catalog(), power).filter((t) => t.player !== 3);

    expect(playedUses(timeline, tools)).toEqual([
      { player: 1, action: 7531, name: 'Rampart', at: 10_000, target: null, covers: [] },
      { player: 2, action: 185, name: 'Adloquium', at: 21_500, target: 1, covers: [] },
    ]);
  });
});
