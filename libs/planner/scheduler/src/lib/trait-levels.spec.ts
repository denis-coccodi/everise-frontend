import { action, catalog, heal, party, pull } from './scheduler-fixtures';
import { catalogAtLevel, pullLevel } from './trait-levels';

describe('catalogAtLevel', () => {
  // Essential Dignity: 3 charges at 100, 2 from 78, 1 below; a heal that
  // grows from 400 at 98 (not the game's, to see the effects change).
  const dignity = () =>
    action(3614, 'Essential Dignity', ['AST'], 40, [heal(500)], {
      charges: 3,
      traits: [
        { trait: 'Enhanced Essential Dignity II', level: 98, recastMs: 40_000, charges: 2, effects: [heal(400)] },
        { trait: 'Enhanced Essential Dignity', level: 78, recastMs: 40_000, charges: 1, effects: [heal(400)] },
      ],
    });
  const at = (level: number) => {
    const cat = { ...catalog(), actions: [dignity()] };
    const [{ charges, effects }] = catalogAtLevel(cat, level).actions;
    return [charges, effects[0].potency];
  };

  it('gives an action as it is below each trait it has', () => {
    expect(at(100)).toEqual([3, 500]);
    expect(at(98)).toEqual([3, 500]);
    expect(at(90)).toEqual([2, 400]);
    expect(at(70)).toEqual([1, 400]);
  });
});

describe('pullLevel', () => {
  it("is the party's level, or 100 without stats", () => {
    const timeline = pull([], []);
    expect(pullLevel(timeline)).toBe(100);

    timeline.players = party().map((p) => ({ ...p, stats: { ...stats(), level: 90 } }));
    expect(pullLevel(timeline)).toBe(90);
  });
});

function stats() {
  return {
    level: 100,
    strength: 0,
    dexterity: 0,
    vitality: 0,
    intelligence: 0,
    mind: 0,
    piety: 0,
    determination: 0,
    criticalHit: 0,
    directHit: 0,
    skillSpeed: 0,
    spellSpeed: 0,
    tenacity: 0,
  };
}
