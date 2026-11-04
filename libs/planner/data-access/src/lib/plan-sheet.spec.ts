import type { Mechanic, Plan, ReferencedTimeline } from '@everise/planner/scheduler';
import { planSheet } from './plan-sheet';
import { actionCatalog, pullTimeline } from './planner-fixtures';

// Killer Voice at 1:05 on both players; a second one at 2:30.
const mechanic = (id: number, at: number): Mechanic => ({
  id,
  at,
  action: 45956,
  name: 'Killer Voice',
  kind: 'raidwide',
  damageType: 'magic',
  hits: [
    { player: 1, unmitigated: 100_000, asPlayed: 40_000, avoidable: false },
    { player: 2, unmitigated: 90_000, asPlayed: 40_000, avoidable: false },
  ],
});

// The scholar replanned: Adloquium for the first; the tank as played.
function plan(): Plan {
  return {
    mechanics: [mechanic(1, 65_000), mechanic(2, 150_000)],
    uses: [{ player: 2, action: 185, name: 'Adloquium', at: 63_000, target: 1, covers: [1] }],
    hits: [],
    unplaced: [],
    hp: [],
    replanned: [2],
  };
}

describe('planSheet', () => {
  it('puts each player’s mitigations and heals on the row of the attack they’re for', () => {
    const sheet = planSheet(plan(), pullTimeline(), actionCatalog());

    expect(sheet.rows.map((r) => [r.at, r.mechanic, r.kind, r.damageType, r.damage])).toEqual([
      [65_000, 'Killer Voice', 'raidwide', 'magic', 100_000],
      [150_000, 'Killer Voice', 'raidwide', 'magic', 100_000],
    ]);
    // The tank's Rampart and Reprisal as played (not Fast Blade, an
    // attack); the scholar's Adloquium as planned.
    expect(sheet.rows[0].cells.map((c) => c.map((s) => s.name))).toEqual([['Rampart', 'Reprisal'], ['Adloquium']]);
    expect(sheet.rows[1].cells).toEqual([[], []]);
  });

  it('lists the players by role, with room for the most they use at once and what they could pick', () => {
    const [tank, healer] = planSheet(plan(), pullTimeline(), actionCatalog()).players;

    expect([tank.name, tank.role, tank.slots]).toEqual(['Tank Main', 'tank', 2]);
    expect([healer.name, healer.role, healer.slots]).toEqual(['Heal Main', 'healer', 1]);
    // The fixture's catalog has everything on PLD.
    expect(tank.choices.map((s) => s.name)).toEqual(['Adloquium', 'Rampart', 'Reprisal']);
    expect(healer.choices).toEqual([{ name: 'Adloquium', icon: 800 }]);
  });

  it('marks the rows past a completed wipe’s log', () => {
    const timeline: ReferencedTimeline = {
      ...pullTimeline(),
      completion: { from: 100_000, clear: { code: 'x', pullId: 1 }, plannedFrom: [] },
    };

    const sheet = planSheet(plan(), timeline, actionCatalog());

    expect(sheet.completedFrom).toBe(100_000);
    expect(sheet.rows.map((r) => r.completed)).toEqual([false, true]);
  });
});
