import type { PullTimeline } from '@everise/core/api-types';
import { withAttackNames } from './attack-names';
import { pull } from './scheduler-fixtures';

// The paladin (1) is the tank; 2 and 3 aren't.
function timeline(actions: PullTimeline['actions'], damage: [number, number, number][]): PullTimeline {
  const base = pull([]);
  const hit = base.damage[0] ?? pull([[1, 'Killer Voice', 1, 1000]]).damage[0];
  return {
    ...base,
    actions,
    damage: damage.map(([at, action, target]) => ({ ...hit, at: at * 1000, action, target, tick: false })),
  };
}
const names = (t: PullTimeline) => withAttackNames(t).actions.map((a) => a.name);

describe('withAttackNames', () => {
  it('calls every auto-attack "Attack", the ones the game left in Japanese too', () => {
    const t = timeline(
      [
        { id: 7, name: 'attack' },
        { id: 40176, name: '攻撃' },
        { id: 8, name: 'Attaque' },
        { id: 9, name: 'Crown of Arcadia' },
      ],
      [],
    );

    expect(names(t)).toEqual(['Attack', 'Attack', 'Attack', 'Crown of Arcadia']);
  });

  it('takes an unnamed attack on (nearly) nobody but the tanks, every few seconds, as an auto-attack', () => {
    const autoAttack = 0x9cb3;
    const t = timeline(
      [{ id: autoAttack, name: 'unknown_9cb3' }],
      // One of eleven caught the bard (3) in the boss's cleave.
      [
        ...[10, 13, 16, 19, 22, 25, 28, 31, 34, 37].map((s): [number, number, number] => [s, autoAttack, 1]),
        [40, autoAttack, 3],
      ],
    );

    expect(names(t)).toEqual(['Attack']);
  });

  it('keeps an unnamed tank buster, a minute apart, as an attack of its own', () => {
    const buster = 0x9cc0;
    const t = timeline(
      [{ id: buster, name: 'unknown_9cc0' }],
      [10, 70, 130].map((s): [number, number, number] => [s, buster, 1]),
    );

    expect(names(t)).toEqual(['Unnamed attack (9CC0)']);
  });

  it('names any other unnamed attack by its id, as guides write it', () => {
    const raidwide = 0x9ced;
    const t = timeline(
      [
        { id: raidwide, name: 'unknown_9ced' },
        { id: 0x9cee, name: 'unknown_9cee' },
      ],
      [
        [10, raidwide, 1],
        [10, raidwide, 2],
        [10, raidwide, 3],
      ],
    );

    expect(names(t)).toEqual(['Unnamed attack (9CED)', 'Unnamed attack (9CEE)']);
  });
});
