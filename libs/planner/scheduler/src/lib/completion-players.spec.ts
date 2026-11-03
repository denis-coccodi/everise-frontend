import type { PullTimeline } from '@everise/core/api-types';
import { standIns } from './completion-players';
import { pull } from './scheduler-fixtures';

type Job = [id: number, job: string, role: 'tank' | 'healer' | 'melee' | 'ranged' | 'caster'];

// Another group's kill, with these players.
function kill(players: Job[]): PullTimeline {
  return {
    ...pull([]),
    players: players.map(([id, job, role]) => ({ ...pull([]).players[0], id, job, role, name: `${job} Other` })),
  };
}

describe('standIns', () => {
  // The wipe's group: a paladin (1), a scholar (2) and a bard (3).
  const wipe = pull([]);

  it("stands each of the kill's players in for one of the group, the same job first, then the same role", () => {
    const other = kill([
      [11, 'BRD', 'ranged'],
      [12, 'WAR', 'tank'],
      [13, 'SCH', 'healer'],
    ]);

    expect(standIns(wipe, other)).toEqual({
      11: { player: 3, sameJob: true },
      12: { player: 1, sameJob: false },
      13: { player: 2, sameJob: true },
    });
  });

  it('falls back to the same kind of player, then to whoever is left', () => {
    // A caster for the bard (both DPS), a second healer for the paladin.
    const other = kill([
      [11, 'PCT', 'caster'],
      [12, 'WHM', 'healer'],
      [13, 'AST', 'healer'],
    ]);

    expect(standIns(wipe, other)).toEqual({
      11: { player: 3, sameJob: false },
      12: { player: 2, sameJob: false },
      13: { player: 1, sameJob: false },
    });
  });

  it('gives a job to its own player before a player of the same role takes it', () => {
    // By role alone, the WHM listed first would take the scholar.
    const other = kill([
      [11, 'WHM', 'healer'],
      [12, 'SCH', 'healer'],
      [13, 'PLD', 'tank'],
    ]);

    expect(standIns(wipe, other)).toEqual({
      11: { player: 3, sameJob: false },
      12: { player: 2, sameJob: true },
      13: { player: 1, sameJob: true },
    });
  });
});
