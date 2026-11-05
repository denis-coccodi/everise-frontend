import type { Mechanic, MechanicHit, PlannedHit } from './plan.model';

type Projection = { damage: number; absorbed: number; statuses: string[]; invulnerable: boolean };

// The plan's hits with its mitigations up, at full HP: the heals come
// after. Safe where they leave the margin (`limit`) or can't kill.
export function plannedHits(
  mechanics: Mechanic[],
  project: (m: Mechanic, h: MechanicHit) => Projection,
  limit: (m: Mechanic, h: MechanicHit) => number,
  maxHp: Map<number, number>,
): PlannedHit[] {
  return mechanics.flatMap((m) =>
    m.hits.map((hit) => {
      const { damage, absorbed, statuses, invulnerable } = project(m, hit);
      const hp = maxHp.get(hit.player);
      return {
        mechanic: m.id,
        player: hit.player,
        unmitigated: hit.unmitigated,
        planned: damage,
        asPlayed: hit.asPlayed,
        absorbed,
        hpBefore: hp ?? null,
        share: hp ? damage / hp : null,
        safe: invulnerable || damage <= limit(m, hit),
        invulnerable,
        avoidable: hit.avoidable,
        covers: statuses,
      };
    }),
  );
}
