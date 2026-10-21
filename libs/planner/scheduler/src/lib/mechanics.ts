import { PullTimeline, TimelineHit } from '@everise/core/api-types';
import { Mechanic } from './plan.model';

// Hits of one attack this close to the first are one mechanic.
const SAME_MECHANIC_MS = 1000;

// The pull's boss mechanics: its hits grouped by attack and moment, leaving
// out damage over time ticks, auto-attacks ("Attack") and hits that did no
// damage. A mechanic on most of the party is a raidwide; one on a tank or
// two alone is a tank buster.
export function mechanicsOf(timeline: PullTimeline): Mechanic[] {
  const actionName = new Map(timeline.actions.map((action) => [action.id, action.name]));
  const tanks = new Set(timeline.players.filter((p) => p.role === 'tank').map((p) => p.id));
  const raidwideAt = Math.max(2, Math.ceil(timeline.players.length * 0.75));
  const hits = timeline.damage.filter(
    (hit) => !hit.tick && unmitigated(hit) > 0 && actionName.get(hit.action)?.toLowerCase() !== 'attack',
  );

  const groups: { action: number; at: number; hits: TimelineHit[] }[] = [];
  for (const hit of [...hits].sort((a, b) => a.at - b.at)) {
    const group = groups.find((g) => g.action === hit.action && hit.at - g.at <= SAME_MECHANIC_MS);
    if (group) group.hits.push(hit);
    else groups.push({ action: hit.action, at: hit.at, hits: [hit] });
  }

  return groups.map((group, id) => {
    const players = new Set(group.hits.map((hit) => hit.target));
    const kind =
      players.size >= raidwideAt
        ? 'raidwide'
        : players.size <= 2 && [...players].every((p) => tanks.has(p))
          ? 'tankbuster'
          : 'targeted';
    return {
      id,
      at: group.at,
      action: group.action,
      name: actionName.get(group.action) ?? 'Unknown',
      kind,
      hits: group.hits.map((hit) => ({ player: hit.target, unmitigated: unmitigated(hit), asPlayed: hit.amount })),
    };
  });
}

// A hit's damage before anything reduced it: the log's, or what it took
// plus what mitigation and shields took off.
function unmitigated(hit: TimelineHit) {
  return hit.unmitigated ?? hit.amount + hit.mitigated + hit.absorbed;
}
