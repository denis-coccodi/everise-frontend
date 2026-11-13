import { projected } from './coverage';
import type { PullFacts } from './coverage.model';
import type { HpTrack } from './hp-track';
import type { Mechanic, MechanicHit, MitigationTool, Plan, PlannedHit, PlannedUse } from './plan.model';
import type { WalkingDead } from './walking-dead.model';

// The HP each of the plan's hits lands on with the heals so far (less what
// lands with it, `together`), by "<mechanic>:<player>".
export function hpBefores(plan: Plan, track: HpTrack, together: (m: Mechanic, player: number) => number) {
  const atOf = new Map(plan.mechanics.map((m) => [m.id, m]));
  const hp = new Map<string, number>();
  for (const hit of plan.hits) {
    const start = track.checkpoint(hit.player, -1);
    const m = atOf.get(hit.mechanic) as Mechanic;
    if (start) hp.set(`${hit.mechanic}:${hit.player}`, Math.round(track.before(start, m.at) - together(m, hit.player)));
  }
  return hp;
}

// Each hit judged with the heals: the HP it lands on (less what lands with
// it, `together`), and whether it leaves the margin. One a heal's
// mitigation lowered (its damage no longer `damage` has: Kerachole...) is
// projected again with every mitigation up (`mitigating`). Under Living
// Dead, one the tank isn't healed full after dies. `needed`: the HP each
// landed on before the plan refilled everyone (`hpNeeded`).
export function judgedHits(
  plan: Plan,
  maxHp: Map<number, number>,
  margin: number,
  track: HpTrack,
  deads: WalkingDead[],
  damage: Map<string, number>,
  together: (m: Mechanic, player: number) => number,
  mitigation: {
    uses: PlannedUse[];
    toolOf: (use: PlannedUse) => MitigationTool;
    facts: PullFacts;
    needed?: Map<string, number>;
  },
): PlannedHit[] {
  const mechanicOf = new Map(plan.mechanics.map((m) => [m.id, m]));
  const lowered = (hit: PlannedHit): PlannedHit => {
    const m = mechanicOf.get(hit.mechanic) as Mechanic;
    const mechanicHit = m.hits.find((h) => h.player === hit.player) as MechanicHit;
    const projection = projected(m, mechanicHit, mitigation.uses, mitigation.toolOf, mitigation.facts);
    const { damage: planned, absorbed, statuses, invulnerable } = projection;
    const max = maxHp.get(hit.player);
    return { ...hit, planned, absorbed, invulnerable, covers: statuses, share: max ? planned / max : null };
  };
  return plan.hits.map((planned) => {
    const changed = damage.get(`${planned.mechanic}:${planned.player}`) !== planned.planned;
    const hit = changed ? lowered(planned) : planned;
    const start = track.checkpoint(hit.player, -1);
    if (!start) return hit;
    const max = maxHp.get(hit.player) as number;
    const m = mechanicOf.get(hit.mechanic) as Mechanic;
    const hpBefore = Math.round(track.before(start, m.at) - together(m, hit.player));
    const dead = deads.find((d) => d.trigger.id === hit.mechanic && d.player === hit.player);
    const healed = !dead || track.before(start, dead.check.at + 1) >= max - 1;
    const safe = (hit.invulnerable && healed) || hit.avoidable || hpBefore - hit.planned >= margin * max - 1;
    const needed = mitigation.needed?.get(`${hit.mechanic}:${hit.player}`);
    return { ...hit, hpBefore, safe, hpNeeded: needed };
  });
}
