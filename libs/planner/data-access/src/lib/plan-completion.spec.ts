import type { PullTimeline } from '@everise/core/api-types';
import type { ReferencedTimeline } from '@everise/planner/scheduler';
import { wipeCompletion } from './plan-completion';
import { actionCatalog, pullTimeline } from './planner-fixtures';

// A log with the boss's casts every 30s up to `seconds` (the same script
// in every group), lasting `seconds`.
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
  return {
    ...base,
    durationMs: seconds * 1000,
    actions: [...base.actions, ...names.map((name, i) => ({ id: 900 + i, name }))],
    damage: base.damage.filter((h) => h.at < seconds * 1000),
    enemyCasts: casts,
  };
}

// The same, ending with everyone dead to the boss's last cast.
function wipe(seconds: number, clears?: PullTimeline[]): ReferencedTimeline {
  const log = fight(seconds);
  const ended = log.players.map((p) => ({ at: seconds * 1000, player: p.id, action: null, source: null }));
  return { ...log, deaths: [...log.deaths, ...ended], ...(clears ? { clears } : {}) };
}

describe('wipeCompletion', () => {
  const catalog = actionCatalog();

  it('has nothing to complete on a kill, and waits for the kills on a wipe', () => {
    expect(wipeCompletion(wipe(200), false, catalog)).toEqual({ state: 'kill' });
    expect(wipeCompletion(wipe(200), true, catalog)).toEqual({ state: 'reading' });
  });

  it('plans only what was logged when no kill could be read, or the wipe lasted under half', () => {
    expect(wipeCompletion(wipe(200, []), true, catalog)).toEqual({ state: 'none' });
    expect(wipeCompletion(wipe(200, [fight(500), fight(540), fight(520)]), true, catalog)).toEqual({
      state: 'short',
      lasted: 200_000,
      usual: 520_000,
    });
  });

  it('offers the wipe completed from a kill once it got halfway', () => {
    const done = wipeCompletion(wipe(300, [fight(500)]), true, catalog);

    expect(done).toMatchObject({ state: 'offered', lasted: 300_000, usual: 500_000 });
    expect(done.state === 'offered' && done.timeline.durationMs).toBe(500_000);
    // Just before the cast that killed everyone, at 299 s.
    expect(done.state === 'offered' && done.timeline.completion?.from).toBe(298_999);
  });

  it('says when the kills have nothing left to add', () => {
    expect(wipeCompletion(wipe(500, [fight(450)]), true, catalog)).toMatchObject({ state: 'nothing-left' });
  });
});
