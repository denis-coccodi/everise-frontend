import { PullTimeline, TimelineHit } from '@everise/core/api-types';
import { Mechanic } from './plan.model';

// Hits of one attack this close to the first are one mechanic.
const SAME_MECHANIC_MS = 1000;
// A hit this many times what the attack usually does to a player (and more
// than their max HP) is a failed mechanic.
const FAILED_TIMES = 3;
// More than this many times a player's max HP, no mitigation saves them.
const UNSURVIVABLE = 3;
// A death this soon after a hit is the hit's.
const DEATH_MS = 2_000;

// The pull's boss mechanics: its hits grouped by attack and moment, leaving
// out damage over time ticks, auto-attacks ("Attack") and hits that did no
// damage. A mechanic on most of the party is a raidwide; one on a tank or
// two alone is a tank buster. A hit many times what the attack usually does
// to a player (the median of its hits in the pull), and more than their max
// HP, is a failed mechanic when it killed them or no mitigation would save
// them (`UNSURVIVABLE` times their max HP): one they survived as played was
// mitigated, and the plan must cover it too. A failed one is avoided when
// `ignore` says so, or when nothing would save them; the plan covers the
// rest like any other hit.
export function mechanicsOf(timeline: PullTimeline, ignore = false): Mechanic[] {
  const actionName = new Map(timeline.actions.map((action) => [action.id, action.name]));
  const tanks = new Set(timeline.players.filter((p) => p.role === 'tank').map((p) => p.id));
  const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp]));
  const raidwideAt = Math.max(2, Math.ceil(timeline.players.length * 0.75));
  const hits = timeline.damage.filter((hit) => isMechanicHit(hit, actionName));
  // By the attack's name: the game gives some variants of one their own ids.
  const nameOf = (hit: TimelineHit) => actionName.get(hit.action) ?? String(hit.action);
  const usual = new Map<string, number>();
  for (const name of new Set(hits.map(nameOf))) {
    usual.set(name, median(hits.filter((h) => nameOf(h) === name).map(unmitigated)));
  }
  const died = (hit: TimelineHit) =>
    timeline.deaths.some((d) => d.player === hit.target && d.at >= hit.at && d.at - hit.at <= DEATH_MS);
  const failed = (hit: TimelineHit) => {
    const max = maxHp.get(hit.target);
    const damage = unmitigated(hit);
    if (!max || damage <= max || damage <= FAILED_TIMES * (usual.get(nameOf(hit)) ?? Infinity)) return false;
    return damage >= UNSURVIVABLE * max || died(hit);
  };

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
      // One attack: one damage type.
      damageType: group.hits[0].damageType,
      hits: group.hits.map((hit) => {
        const unsaved = unmitigated(hit) >= UNSURVIVABLE * (maxHp.get(hit.target) ?? Infinity);
        const fails = failed(hit);
        return {
          player: hit.target,
          unmitigated: unmitigated(hit),
          asPlayed: hit.amount,
          ...(fails ? { failed: true } : {}),
          avoidable: fails && (ignore || unsaved),
        };
      }),
    };
  });
}

// Whether a hit is part of a boss mechanic: not a damage over time tick, an
// auto-attack, or a hit that did no damage.
export function isMechanicHit(hit: TimelineHit, actionName: Map<number, string>) {
  return !hit.tick && unmitigated(hit) > 0 && actionName.get(hit.action)?.toLowerCase() !== 'attack';
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// A hit's damage before anything reduced it: the log's, or what it took
// plus what mitigation and shields took off.
function unmitigated(hit: TimelineHit) {
  return hit.unmitigated ?? hit.amount + hit.mitigated + hit.absorbed;
}
