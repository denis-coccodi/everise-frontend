import { castsStopAt, earlyUses, lateStarts, startingAt } from './completion-plan';
import type { ReferencedTimeline } from './reference-damage.model';
import { catalog, pull } from './scheduler-fixtures';
import { mitigationTools } from './tools';

describe('late starts', () => {
  // A wipe completed from 50s.
  const completed = (): ReferencedTimeline => ({
    ...pull([]),
    playerCasts: [
      { at: 20_000, source: 1, target: 1, action: 7531, castMs: null },
      { at: 70_000, source: 1, target: 1, action: 7531, castMs: null },
    ],
    completion: { from: 50_000, clear: { code: 'Other0000000000a', pullId: 7 } },
  });

  it('starts at the wipe point those not asked to be replanned from the start', () => {
    expect([...lateStarts(completed(), { margin: 0.1, replan: [2, 3] })]).toEqual([[1, 50_000]]);
  });

  it('starts nobody late when everyone is replanned, or the pull is no completed wipe', () => {
    expect(lateStarts(completed(), { margin: 0.1 }).size).toBe(0);
    expect(lateStarts(pull([]), { margin: 0.1, replan: [2] }).size).toBe(0);
  });

  it('stops the GCDs as played at the wipe point of everyone, replanned from the start or not', () => {
    expect([...castsStopAt(completed())].map(([, at]) => at)).toEqual(completed().players.map(() => 50_000));
    expect(castsStopAt(pull([])).size).toBe(0);
  });

  it("keeps a late player's tools away until their start, and their uses before it as played", () => {
    const timeline = completed();
    const late = new Map([[1, 50_000]]);
    const tools = startingAt(mitigationTools(timeline.players, catalog()), late);

    expect(tools.find((t) => t.player === 1)?.away).toEqual([{ from: -Infinity, to: 50_000 }]);
    expect(tools.find((t) => t.player === 2)?.away).toBeUndefined();
    expect(earlyUses(timeline, tools, late).map((u) => [u.name, u.at, u.played])).toEqual([['Rampart', 20_000, true]]);
  });

  it("keeps a late white mage's Afflatus Miseries before their start, for the Blood Lily", () => {
    const timeline = completed();
    timeline.playerCasts.push(
      { at: 30_000, source: 2, target: 13, action: 16535, castMs: null },
      { at: 60_000, source: 2, target: 13, action: 16535, castMs: null },
    );

    expect(earlyUses(timeline, [], new Map([[2, 50_000]]))).toEqual([
      expect.objectContaining({ player: 2, name: 'Afflatus Misery', at: 30_000, damage: true, played: true }),
    ]);
  });
});
