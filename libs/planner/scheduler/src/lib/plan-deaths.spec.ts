import type { PullTimeline } from '@everise/core/api-types';
import type { Mechanic, Plan, PlannedHit } from './plan.model';
import { withDeaths } from './plan-deaths';
import { action, catalog, party, pull } from './scheduler-fixtures';

// A paladin (1), a scholar (2), a bard (3), and here a red mage (4); 100,000
// HP each. Raidwides at 60 s and, unless said, 100 s.
function setup(jobs: string[] = ['PLD', 'SCH', 'BRD', 'RDM']) {
  const t: PullTimeline = {
    ...pull([]),
    players: party()
      .concat({ ...party()[2], id: 4, name: 'RDM Main', job: 'RDM', role: 'caster' })
      .filter((p) => jobs.includes(p.job ?? '')),
  };
  const c = catalog();
  c.actions.push(
    action(7523, 'Verraise', ['RDM'], 2.5, [], { gcd: true }),
    action(173, 'Resurrection', ['SCH', 'SMN'], 2.5, [], { gcd: true, castMs: 8_000 }),
    action(7561, 'Swiftcast', ['SCH', 'RDM'], 40, []),
  );
  return { t, c };
}
const mechanic = (id: number, at: number): Mechanic => ({
  id,
  at,
  action: 100 + id,
  name: `Raidwide ${id}`,
  kind: 'raidwide',
  damageType: 'magic',
  hits: [],
});
const hit = (mechanicId: number, player: number, hpBefore: number, planned: number): PlannedHit => ({
  mechanic: mechanicId,
  player,
  unmitigated: planned,
  planned,
  asPlayed: planned,
  absorbed: 0,
  hpBefore,
  share: planned / 100_000,
  safe: hpBefore - planned >= 10_000,
  invulnerable: false,
  avoidable: false,
  covers: [],
});
// The bard dies to the raidwide at 60 s.
function plan(at2 = 100_000): Plan {
  return {
    mechanics: [mechanic(1, 60_000), mechanic(2, at2)],
    uses: [{ player: 3, action: 999, name: 'Troubadour', at: 64_000, target: null, covers: [] }],
    hits: [hit(1, 3, 50_000, 80_000), hit(1, 1, 100_000, 50_000), hit(2, 3, 100_000, 30_000)],
    unplaced: [],
    hp: [3, 1].map((player) => ({ player, points: [{ at: 0, hp: 100_000 }] })),
  };
}

describe('withDeaths', () => {
  it("has the red mage raise a player the plan couldn't keep alive, as soon as they can", () => {
    const { t, c } = setup();

    const out = withDeaths(plan(), t, c);

    expect(out.deaths).toEqual([{ player: 3, at: 60_000, mechanic: 1, raisedBy: 4, raisedAt: 62_500, backAt: 70_500 }]);
    expect(out.uses.filter((u) => u.raise).map((u) => [u.player, u.name, u.at, u.target])).toEqual([
      [4, 'Verraise', 62_500, 3],
    ]);
    // Dead, they do nothing: their Troubadour at 64 s is gone.
    expect(out.uses.some((u) => u.name === 'Troubadour')).toBe(false);
    expect(out.hits.find((h) => h.player === 3 && h.mechanic === 1)?.fatal).toBe(true);
    // Their HP: none until they're back, at 20%.
    expect(out.hp.find((h) => h.player === 3)?.points).toEqual([
      { at: 0, hp: 100_000 },
      { at: 60_000, hp: 0 },
      { at: 70_500, hp: 20_000 },
    ]);
  });

  it('waits until just after a raidwide that would land as they come back', () => {
    const { t, c } = setup();

    // The next raidwide at 72 s: within 5 s of their 70.5 s return.
    const out = withDeaths(plan(72_000), t, c);

    expect(out.deaths?.[0]).toMatchObject({ raisedBy: 4, raisedAt: 72_500, backAt: 80_500 });
  });

  it("uses a healer's Swiftcast without a red mage, and says when nobody can raise", () => {
    const { t, c } = setup(['PLD', 'SCH', 'BRD']);

    const out = withDeaths(plan(), t, c);
    expect(out.uses.filter((u) => u.raise).map((u) => [u.player, u.name])).toEqual([
      [2, 'Swiftcast'],
      [2, 'Resurrection'],
    ]);

    const alone = setup(['PLD', 'BRD']);
    expect(withDeaths(plan(), alone.t, alone.c).deaths?.[0]).toMatchObject({ raisedBy: null, backAt: null });
  });

  it('changes nothing when nobody dies', () => {
    const { t, c } = setup();
    const safe = { ...plan(), hits: [hit(1, 1, 100_000, 50_000)] };

    expect(withDeaths(safe, t, c)).toBe(safe);
  });

  it('counts HP run out by anything, a damage-over-time tick too, as a death, and names it', () => {
    const { t, c } = setup();
    const bleed = {
      at: 80_000,
      action: 555,
      amount: 45_000,
      target: 3,
      source: 9,
      tick: true,
      unmitigated: 45_000,
      hp: 0,
    };
    const timeline = {
      ...t,
      actions: [...t.actions, { id: 555, name: 'Bleeding' }],
      damage: [bleed],
    } as unknown as PullTimeline;
    const ticked = {
      ...plan(),
      hits: [hit(1, 1, 100_000, 50_000)],
      hp: [
        {
          player: 3,
          points: [
            { at: 0, hp: 100_000 },
            { at: 79_000, hp: 30_000 },
            { at: 80_000, hp: 0 },
            { at: 81_000, hp: 2_000 },
          ],
        },
      ],
    };

    const [death] = withDeaths(ticked, timeline, c).deaths ?? [];

    expect(death).toMatchObject({ player: 3, at: 80_000, mechanic: null, cause: 'Bleeding', raisedBy: 4 });
  });
});
