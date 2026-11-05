import type { Plan } from '@everise/planner/scheduler';
import { deathsText } from './plan-deaths-text';
import { pullTimeline } from './planner-fixtures';

const base: Plan = {
  mechanics: [
    { id: 1, at: 65_000, action: 45956, name: 'Killer Voice', kind: 'raidwide', damageType: 'magic', hits: [] },
  ],
  uses: [],
  hits: [],
  unplaced: [],
  hp: [],
};

describe('deathsText', () => {
  it('says nothing when nobody dies', () => {
    expect(deathsText(base, pullTimeline().players)).toBe('');
  });

  it('names who dies to what, who raises them how, and what it costs', () => {
    const plan: Plan = {
      ...base,
      uses: [
        { player: 2, action: 7561, name: 'Swiftcast', at: 67_000, target: null, covers: [], raise: true },
        { player: 2, action: 173, name: 'Resurrection', at: 67_500, target: 1, covers: [], raise: true },
      ],
      deaths: [{ player: 1, at: 65_000, mechanic: 1, raisedBy: 2, raisedAt: 67_500, backAt: 75_500 }],
    };

    expect(deathsText(plan, pullTimeline().players)).toBe(
      ' One player still dies, which nothing the plan has can prevent: Tank Main (PLD) to Killer Voice at 1:05,' +
        " raised by Heal Main (SCH)'s Swiftcast Resurrection at 1:07." +
        ' A death costs most of that player’s damage until they’re back, and 25% of it for about 100 s after (Weakness): a DPS check likely fails.',
    );
  });

  it('says when nobody can raise them', () => {
    const plan = {
      ...base,
      deaths: [{ player: 1, at: 65_000, mechanic: 1, raisedBy: null, raisedAt: null, backAt: null }],
    };

    expect(deathsText(plan, pullTimeline().players)).toContain(
      'Tank Main (PLD) to Killer Voice at 1:05, and nobody can raise them.',
    );
  });
});
