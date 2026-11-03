import type { PullTimeline } from '@everise/core/api-types';
import type { ReferencedTimeline } from '@everise/planner/scheduler';
import { wipeCompletion } from './plan-completion';
import { actionCatalog, pullTimeline } from './planner-fixtures';

// A log with the boss's casts every 30s up to `seconds` (the same script
// in every group), each hitting the party a second later: a mechanic every
// 30s. Lasting `seconds`.
function fight(seconds: number): PullTimeline {
  const base = pullTimeline();
  const names = ['Killer Voice', 'Hardcore', 'Vamp Stomp', 'Brutal Rain'];
  const casts = Array.from({ length: Math.floor(seconds / 30) }, (_, i) => ({
    at: (i + 1) * 30_000 - 1000,
    source: base.enemies[0].id,
    target: null,
    action: 900 + (i % names.length),
    castMs: 3000,
  }));
  const hits = casts.flatMap((c) =>
    base.players.map((p) => ({ ...base.damage[0], at: c.at + 1000, target: p.id, source: c.source, action: c.action })),
  );
  return {
    ...base,
    durationMs: seconds * 1000,
    actions: [...base.actions, ...names.map((name, i) => ({ id: 900 + i, name }))],
    damage: hits.filter((h) => h.at < seconds * 1000),
    enemyCasts: casts,
    deaths: [],
  };
}

// The same, ending with everyone dead to the boss's last cast.
function wipe(seconds: number, clears?: PullTimeline[]): ReferencedTimeline {
  const log = fight(seconds);
  const ended = log.players.map((p) => ({ at: seconds * 1000, player: p.id, action: null, source: null }));
  return { ...log, deaths: ended, ...(clears ? { clears } : {}) };
}

describe('wipeCompletion', () => {
  const catalog = actionCatalog();

  it('has nothing to complete on a kill, and waits for the kills on a wipe', () => {
    expect(wipeCompletion(wipe(200), false, catalog)).toEqual({ state: 'kill' });
    expect(wipeCompletion(wipe(200), true, catalog)).toEqual({ state: 'reading' });
  });

  it("plans only what was logged when no kill could be read, or the wipe got through under half the kill's mechanics", () => {
    expect(wipeCompletion(wipe(200, []), true, catalog)).toEqual({ state: 'none' });
    // Lost to the cast at 179 s: 5 of the kill nearest the usual length's 17 mechanics.
    expect(wipeCompletion(wipe(200, [fight(500), fight(540), fight(520)]), true, catalog)).toEqual({
      state: 'short',
      reached: 5,
      total: 17,
    });
  });

  it('offers the wipe completed from a kill once it got through half its mechanics', () => {
    const done = wipeCompletion(wipe(300, [fight(500)]), true, catalog);

    expect(done).toMatchObject({ state: 'offered', reached: 9, total: 16 });
    expect(done.state === 'offered' && done.timeline.durationMs).toBe(500_000);
  });

  it('says when the kills have nothing left to add', () => {
    expect(wipeCompletion(wipe(500, [fight(450)]), true, catalog)).toMatchObject({
      state: 'nothing-left',
      reached: 14,
      total: 14,
    });
  });
});
