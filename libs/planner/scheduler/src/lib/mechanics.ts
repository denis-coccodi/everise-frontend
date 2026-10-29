import { PullTimeline, TimelineHit } from '@everise/core/api-types';
import { Mechanic } from './plan.model';
import type { ReferenceDamage, ReferencedTimeline } from './reference-damage.model';

// Hits of one attack this close to the first are one mechanic.
const SAME_MECHANIC_MS = 1000;
// A hit this many times what the attack usually does to a player (and more
// than their max HP) is a failed mechanic.
const FAILED_TIMES = 3;
// More than this many times a player's max HP, no mitigation saves them.
const UNSURVIVABLE = 3;
// A death this soon after a hit is the hit's.
const DEATH_MS = 2_000;
// What lets a hit land for nothing: the tanks' invulnerabilities, and a
// raise's Transcendent.
const BLOCKING = new Set(['Hallowed Ground', 'Holmgang', 'Living Dead', 'Walking Dead', 'Superbolide', 'Transcendent']);

// The pull's boss mechanics: its hits grouped by attack and moment, leaving
// out damage over time ticks, auto-attacks ("Attack") and hits that did no
// damage. A mechanic on most of the party is a raidwide; one on a tank or
// two alone is a tank buster. A hit many times what the attack usually does
// to a player (the median of its hits in the pull), and more than their max
// HP, is a failed mechanic when it killed them or no mitigation would save
// them (`UNSURVIVABLE` times their max HP): one they survived as played was
// mitigated, and the plan must cover it too. A failed one is avoided when
// `ignore` says so, or when nothing would save them; the plan covers the
// rest like any other hit. A raidwide every hit of which is unsurvivable is
// a wipe (`wipe`): nothing saves anyone, so it's taken as avoided.
export function mechanicsOf(timeline: ReferencedTimeline, ignore = false): Mechanic[] {
  const actionName = new Map(timeline.actions.map((action) => [action.id, action.name]));
  const tanks = new Set(timeline.players.filter((p) => p.role === 'tank').map((p) => p.id));
  const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp]));
  const raidwideAt = Math.max(2, Math.ceil(timeline.players.length * 0.75));
  const { estimated, fromClears } = blockedHits(timeline, actionName);
  const blocked = new Set(estimated.values());
  const hits = timeline.damage.map((hit) => estimated.get(hit) ?? hit).filter((hit) => isMechanicHit(hit, actionName));
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
    const unsurvivable = (hit: TimelineHit) => unmitigated(hit) >= UNSURVIVABLE * (maxHp.get(hit.target) ?? Infinity);
    const wipe = kind === 'raidwide' && group.hits.every(unsurvivable);
    return {
      id,
      at: group.at,
      action: group.action,
      name: actionName.get(group.action) ?? 'Unknown',
      kind,
      // One attack: one damage type.
      damageType: group.hits[0].damageType,
      hits: group.hits.map((hit) => {
        const fails = failed(hit);
        return {
          player: hit.target,
          unmitigated: unmitigated(hit),
          asPlayed: hit.amount,
          ...(fails ? { failed: true } : {}),
          ...(blocked.has(hit) ? { estimated: fromClears.has(hit) ? ('clears' as const) : ('pull' as const) } : {}),
          avoidable: wipe || (fails && (ignore || unsurvivable(hit))),
        };
      }),
      ...(wipe ? { wipe: true } : {}),
    };
  });
}

// Whether a hit is part of a boss mechanic: not a damage over time tick, an
// auto-attack, or a hit that did no damage.
export function isMechanicHit(hit: TimelineHit, actionName: Map<number, string>) {
  return !hit.tick && unmitigated(hit) > 0 && actionName.get(hit.action)?.toLowerCase() !== 'attack';
}

// The hits an invulnerability blocked (Hallowed Ground, Holmgang...), or a
// raise's Transcendent (the plan keeps them alive, so they'd take it): the
// log has nothing of them, neither damage nor what anything took off. Each
// gets the attack's usual damage before mitigation in the pull (the median
// of its other hits): on the same player, else their role's, else anyone's.
// One the pull has no other hit of gets what other groups' kills say
// (`references`: their role's, else anyone's), or stays out (`missing`), as
// does a hit of nothing with none of these up (an attack that does nothing
// to some).
function blockedHits(timeline: ReferencedTimeline, actionName: Map<number, string>) {
  const role = new Map(timeline.players.map((p) => [p.id, p.role]));
  const blocking = new Set(timeline.statuses.filter((s) => BLOCKING.has(s.name)).map((s) => s.id));
  const nameOf = (hit: TimelineHit) => actionName.get(hit.action) ?? String(hit.action);
  const known = timeline.damage.filter((h) => !h.tick && unmitigated(h) > 0);
  const out = new Map<TimelineHit, TimelineHit>();
  const missing = new Set<string>();
  const fromClears = new Set<TimelineHit>();
  for (const hit of timeline.damage) {
    if (hit.tick || hit.unmitigated !== null || hit.amount || hit.mitigated || hit.absorbed) continue;
    if (!hit.statuses.some((id) => blocking.has(id))) continue;
    const same = known.filter((h) => nameOf(h) === nameOf(hit));
    const pick = [
      same.filter((h) => h.target === hit.target),
      same.filter((h) => role.get(h.target) === role.get(hit.target)),
      same,
    ].find((group) => group.length);
    const reference = timeline.references?.[nameOf(hit)];
    const usual = pick
      ? median(pick.map(unmitigated))
      : reference && (reference.byRole[role.get(hit.target) ?? ''] ?? reference.any);
    if (!usual) {
      missing.add(nameOf(hit));
      continue;
    }
    const estimate = { ...hit, unmitigated: usual };
    out.set(hit, estimate);
    if (!pick) fromClears.add(estimate);
  }
  return { estimated: out, fromClears, missing };
}

// The attacks an invulnerability blocked every time they landed in the
// pull, by name: other groups' kills can say what they do.
export function missingAttacks(timeline: PullTimeline): string[] {
  const actionName = new Map(timeline.actions.map((a) => [a.id, a.name]));
  return [...blockedHits(timeline, actionName).missing];
}

// What other groups' kills (`timelines`) say each of `attacks` does before
// mitigation: the median of its hits per role and on anyone; an attack none
// of them has a hit of is left out.
export function referenceDamage(timelines: PullTimeline[], attacks: string[]): ReferenceDamage {
  const out: ReferenceDamage = {};
  for (const name of attacks) {
    const hits = timelines.flatMap((t) => {
      const role = new Map(t.players.map((p) => [p.id, p.role ?? '']));
      const ids = new Set(t.actions.filter((a) => a.name === name).map((a) => a.id));
      return t.damage
        .filter((h) => ids.has(h.action) && !h.tick && unmitigated(h) > 0)
        .map((h) => ({ role: role.get(h.target) ?? '', damage: unmitigated(h) }));
    });
    if (!hits.length) continue;
    const byRole: Record<string, number> = {};
    for (const r of new Set(hits.map((h) => h.role))) {
      byRole[r] = median(hits.filter((h) => h.role === r).map((h) => h.damage));
    }
    out[name] = { byRole, any: median(hits.map((h) => h.damage)) };
  }
  return out;
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
