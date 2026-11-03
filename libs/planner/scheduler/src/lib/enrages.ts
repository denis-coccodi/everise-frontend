import type { TimelineHit } from '@everise/core/api-types';
import type { Mechanic } from './plan.model';
import type { ReferencedTimeline } from './reference-damage.model';

// More than this many times a player's max HP, no mitigation saves them.
const UNSURVIVABLE = 3;
// The log has a death about 2 s after the hit that killed.
const DEATH_MS = 3_000;

// Which of a pull's mechanics nothing saves anyone from, and how sure
// that is (`Mechanic['wipe']`). With the fight's script (cactbot's), its
// enrages (DPS checks too); else, with other groups' kills read, a
// raidwide that killed everyone it hit and that none of them has; else a
// raidwide every hit of which is `UNSURVIVABLE` times the player's HP,
// which may be an enrage. Any other mechanic is planned for, even one that
// killed everyone: a mitigation mistake, maybe after another group's kill
// time.
export function enrages(timeline: ReferencedTimeline) {
  const names = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp]));
  const enrageIds = timeline.script ? new Set(timeline.script.enrageIds) : null;
  const clears = timeline.clears?.length ? timeline.clears : null;
  const inKills = new Set(clears?.flatMap((c) => c.actions.map((a) => a.name)));
  const killed = (hit: TimelineHit) =>
    hit.overkill > 0 ||
    hit.hp === 0 ||
    timeline.deaths.some((d) => d.player === hit.target && d.at >= hit.at && d.at - hit.at <= DEATH_MS);
  const unsurvivable = (hit: TimelineHit, unmitigated: number) =>
    unmitigated >= UNSURVIVABLE * (maxHp.get(hit.target) ?? Infinity);

  return (kind: Mechanic['kind'], hits: TimelineHit[], unmitigated: (hit: TimelineHit) => number) => {
    if (enrageIds) return hits.some((h) => enrageIds.has(h.action)) ? ('enrage' as const) : undefined;
    if (kind !== 'raidwide') return undefined;
    if (clears) {
      const name = names.get(hits[0].action);
      return hits.every(killed) && name !== undefined && !inKills.has(name) ? ('enrage' as const) : undefined;
    }
    return hits.every((h) => unsurvivable(h, unmitigated(h))) ? ('maybe' as const) : undefined;
  };
}
