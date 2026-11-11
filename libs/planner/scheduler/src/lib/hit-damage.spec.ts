import { hitDamage } from './hit-damage';
import type { Mechanic, Plan, PlannedHit } from './plan.model';

const mechanic = (id: number, at: number, players: number[]): Mechanic => ({
  id,
  at,
  action: id,
  name: `Attack ${id}`,
  kind: 'tankbuster',
  damageType: 'magic',
  hits: players.map((player) => ({ player, unmitigated: 50_000, asPlayed: 30_000, avoidable: false })),
});
const hit = (m: number, player: number, planned: number, invulnerable = false) =>
  ({ mechanic: m, player, planned, invulnerable, avoidable: false }) as PlannedHit;

describe('hitDamage', () => {
  // Dragonsong's Holy Orb and Dark Orb: both tanks hit by both at once.
  const holy = mechanic(1, 773_873, [1, 2]);
  const dark = mechanic(2, 773_873, [1, 2]);
  const breath = mechanic(3, 774_096, [1]);
  const plan = {
    mechanics: [holy, dark, breath],
    hits: [hit(1, 1, 35_000), hit(1, 2, 30_000, true), hit(2, 1, 33_000), hit(2, 2, 31_000), hit(3, 1, 20_000)],
  } as Plan;

  it('says what the attacks landing at the same moment, listed before, take of the player', () => {
    const { together } = hitDamage(plan);

    expect(together(holy, 1)).toBe(0);
    expect(together(dark, 1)).toBe(35_000);
    // Later, not at the same moment: the HP track has it already.
    expect(together(breath, 1)).toBe(0);
  });

  it('leaves out a hit under an invulnerability', () => {
    expect(hitDamage(plan).together(dark, 2)).toBe(0);
  });

  it('follows the damage as heals that mitigate lower it', () => {
    const { damage, together } = hitDamage(plan);
    damage.set('1:1', 20_000);

    expect(together(dark, 1)).toBe(20_000);
  });
});
