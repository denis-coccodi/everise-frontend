import type { FightScript, PullTimeline } from '@everise/core/api-types';
import { pull } from './scheduler-fixtures';
import { scriptMatches } from './script-match';

const script: FightScript = {
  zone: 1327,
  title: 'AAC Heavyweight M4 (Savage)',
  mechanics: [
    { at: 10_000, name: 'Raidwide', ids: [1], phase: null, block: null, enrage: false },
    { at: 20_000, name: 'Tankbuster', ids: [2, 3], phase: null, block: null, enrage: false },
  ],
  enrageIds: [],
  ignoredIds: [4],
  source: { commit: 'abc', path: 'ui/raidboss/data/07-dt/raid/r12s.txt' },
};
// A log whose enemies cast `actions` (id 9 is the auto-attack).
const log = (...actions: number[]): PullTimeline => ({
  ...pull([]),
  actions: [{ id: 9, name: 'attack' }],
  enemyCasts: actions.map((action, i) => ({ at: i * 1000, source: 13, target: null, action, castMs: null })),
});

describe('scriptMatches', () => {
  it('matches when most distinct casts are mechanics or left out ones', () => {
    expect(scriptMatches(log(1, 1, 2, 4, 50), script)).toBe(true);
  });

  it("doesn't match another fight's casts", () => {
    expect(scriptMatches(log(50, 51, 52, 1), script)).toBe(false);
  });

  it('leaves auto-attacks out', () => {
    expect(scriptMatches(log(1, 9, 9, 9), script)).toBe(true);
  });

  it("doesn't match a log without casts", () => {
    expect(scriptMatches(log(9), script)).toBe(false);
  });
});
