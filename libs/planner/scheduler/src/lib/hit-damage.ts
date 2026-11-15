import type { Mechanic, MechanicHit, Plan } from './plan.model';

// What the heals plan around, from the plan's hits: what each takes
// (`damage`, by "<mechanic>:<player>", lowered as heals that mitigate are
// added), the hits that need no healing for (under an invulnerability, or
// avoided), and what the other attacks landing at the same moment take
// (`together`).
export function hitDamage(plan: Plan) {
  const key = (mechanic: number, player: number) => `${mechanic}:${player}`;
  const invulnerable = new Set(
    plan.hits.filter((h) => h.invulnerable || h.avoidable).map((h) => key(h.mechanic, h.player)),
  );
  const damage = new Map(plan.hits.map((h) => [key(h.mechanic, h.player), h.planned]));
  const damageOf = (m: Mechanic, h: MechanicHit) => damage.get(key(m.id, h.player)) ?? h.unmitigated;
  return { invulnerable, damage, damageOf, together: sameMoment(plan.mechanics, damageOf, invulnerable) };
}

// What the other attacks landing on a player at the very moment of a
// mechanic, listed before it, take of them (Dragonsong's Holy Orb and Dark
// Orb, on both tanks at once). The HP before that moment must last through
// them too: judged each alone from it, two hits that together kill looked
// safe. `skipped` hits take nothing (an invulnerability's, an avoided one).
export function sameMoment(
  mechanics: Mechanic[],
  damageOf: (m: Mechanic, h: MechanicHit) => number,
  skipped: Set<string>,
) {
  const byAt = new Map<number, Mechanic[]>();
  for (const m of mechanics) byAt.set(m.at, [...(byAt.get(m.at) ?? []), m]);
  return (mechanic: Mechanic, player: number) => {
    const together = byAt.get(mechanic.at) ?? [];
    const own = together.indexOf(mechanic);
    let damage = 0;
    for (const other of together.slice(0, Math.max(0, own))) {
      const hit = other.hits.find((h) => h.player === player);
      if (hit && !skipped.has(`${other.id}:${player}`)) damage += damageOf(other, hit);
    }
    return damage;
  };
}

// A heavy mechanic's hit takes, mitigated but before shields, this share of
// its target's max HP: the logs' healers top everyone up before those (63
// ultimate kills: HP full from 40%, near 90% before lighter raidwides).
const HEAVY_SHARE = 0.4;
// The share when it lands on fewer players (busters, stacks): full from 50%.
const HEAVY_FEW_SHARE = 0.5;
const HEAVY_TARGETS = 4;

// How many players each mechanic hits (avoided hits left out).
function targetsOf(plan: Plan) {
  const targets = new Map<number, number>();
  for (const h of plan.hits) if (!h.avoidable) targets.set(h.mechanic, (targets.get(h.mechanic) ?? 0) + 1);
  return targets;
}

// The plan's heavy mechanics (ids): the ones healers top everyone up for.
export function heavyMechanics(plan: Plan, maxHp: Map<number, number>): Set<number> {
  const targets = targetsOf(plan);
  const heavy = new Set<number>();
  for (const h of plan.hits) {
    const max = maxHp.get(h.player);
    if (h.avoidable || h.invulnerable || !max) continue;
    const share = (targets.get(h.mechanic) ?? 0) >= HEAVY_TARGETS ? HEAVY_SHARE : HEAVY_FEW_SHARE;
    if (h.planned + h.absorbed >= share * max) heavy.add(h.mechanic);
  }
  return heavy;
}

// Neutral Sect, its barrier's status, and how long after it a Helios Conjunction leaves one.
const NEUTRAL_SECT = 16559;
export const SECT = 'Neutral Sect';
const SECT_MS = 20_000;

// The raidwides (on 4 players or more) in the Neutral Sect of one of
// `casters` (the replanned astrologians): the logs' astrologians shield the
// party for them with Helios Conjunction, about 1.5 for each Neutral Sect.
export function sectRaidwides(plan: Plan, casters: number[]): Set<number> {
  const targets = targetsOf(plan);
  const sects = plan.uses.filter((u) => u.action === NEUTRAL_SECT && casters.includes(u.player)).map((u) => u.at);
  const inSect = (m: { at: number }) => sects.some((at) => m.at > at && m.at <= at + SECT_MS);
  return new Set(plan.mechanics.filter((m) => (targets.get(m.id) ?? 0) >= HEAVY_TARGETS && inSect(m)).map((m) => m.id));
}

// The heavy raidwides (on 4 players or more): the logs' healers go into
// them with everyone full and shielded.
export function heavyRaidwides(plan: Plan, maxHp: Map<number, number>): Set<number> {
  const targets = targetsOf(plan);
  return new Set([...heavyMechanics(plan, maxHp)].filter((id) => (targets.get(id) ?? 0) >= HEAVY_TARGETS));
}
