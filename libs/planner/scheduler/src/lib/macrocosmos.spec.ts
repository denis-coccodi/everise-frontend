import type { TimelinePlayer } from '@everise/core/api-types';
import { macrocosmosUses } from './macrocosmos';
import type { Mechanic } from './plan.model';
import { action, catalog } from './scheduler-fixtures';
import { Weaving } from './weaving';

// An astrologian (2) with GCDs every 2.5s; raidwides at 30s, 60s (heavier)
// and 300s.
const ast: TimelinePlayer = {
  id: 2,
  name: 'AST Main',
  job: 'AST',
  role: 'healer',
  maxHp: 100_000,
  maxMp: null,
  mp: [],
  stats: null,
};
const raidwide = (id: number, at: number, damage = 50_000): Mechanic => ({
  id,
  at,
  action: id,
  name: `Raidwide ${id}`,
  kind: 'raidwide',
  damageType: 'magic',
  hits: [{ player: 2, unmitigated: damage, asPlayed: damage, avoidable: false }],
});
const gcds = Array.from({ length: 160 }, (_, i) => ({
  at: i * 2_500,
  source: 2,
  target: null,
  action: 9,
  castMs: null,
}));

describe('macrocosmosUses', () => {
  it('casts it back from its recast, in the GCD just before the heaviest raidwide within a minute', () => {
    const c = catalog();
    c.actions.push(
      action(9, 'Fall Malefic', ['AST'], 2.5, [], { gcd: true }),
      action(25874, 'Macrocosmos', ['AST'], 180, [], { gcd: true, level: 90 }),
    );
    const weaving = new Weaving(gcds, new Map([[9, true]]));

    const uses = macrocosmosUses(
      [ast],
      c,
      [raidwide(1, 30_000), raidwide(2, 60_000, 80_000), raidwide(3, 300_000)],
      weaving,
    );

    // Before the second, heavier than the first; the third once it's back.
    expect(uses.map((u) => [u.at, u.covers])).toEqual([
      [57_500, [2]],
      [297_500, [3]],
    ]);
  });
});
