import { PullTimeline, TimelineHit } from '@everise/core/api-types';
import { enrages } from './enrages';
import { Mechanic, MechanicHit } from './plan.model';
import type { ReferenceDamage, ReferencedTimeline } from './reference-damage.model';

// Hits of one attack this close to the first are one mechanic.
const SAME_MECHANIC_MS = 1000;
// A hit this many times what the attack usually does to a player (and more
// than their max HP) is a failed mechanic.
const FAILED_TIMES = 3;
// More than this many times a player's max HP, no mitigation saves them.
const UNSURVIVABLE = 3;
// A death this soon after a hit is the hit's: logs have it about 2s after
// (141 deaths in 34 ultimate kills and 29 pulls: 99 in 100 within 2.05s).
const DEATH_MS = 3_000;
// What lets a hit land for nothing: the tanks' invulnerabilities, and a
// raise's Transcendent.
const BLOCKING = new Set(['Hallowed Ground', 'Holmgang', 'Living Dead', 'Walking Dead', 'Superbolide', 'Transcendent']);

// The pull's boss mechanics: its hits grouped by attack and moment, leaving
// out damage over time ticks, auto-attacks ("Attack") and hits that did no
// damage. A mechanic on most of the party is a raidwide; one on a tank or
// two alone is a tank buster. A hit many times what the attack usually does
// to a player (the median of its hits in the pull, or less in other groups'
// kills: to their role, nothing where it never hits there), and more than their max
// HP, is a failed mechanic when it killed them or no mitigation would save
// them (`UNSURVIVABLE` times their max HP): one they survived as played was
// mitigated, and the plan must cover it too. A failed one is avoided when
// `ignore` says so, or when nothing would save them; the plan covers the
// rest like any other hit. An enrage (`enrages`), or a raidwide that may be
// one, is a wipe (`wipe`): nothing saves anyone, so it's taken as avoided. A wipe
// completed from another group's kill has its hits after the wipe point
// estimated from that kill (`completion`).
export function mechanicsOf(timeline: ReferencedTimeline, ignore = false): Mechanic[] {
  const completedAfter = timeline.completion?.from ?? Infinity;
  const actionName = new Map(timeline.actions.map((action) => [action.id, action.name]));
  const tanks = new Set(timeline.players.filter((p) => p.role === 'tank').map((p) => p.id));
  const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp]));
  const raidwideAt = Math.max(2, Math.ceil(timeline.players.length * 0.75));
  const enrage = enrages(timeline);
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
  // At no HP after it, alive, and no invulnerability of theirs up: the
  // fight doesn't let it kill.
  const blocking = new Set(timeline.statuses.filter((s) => BLOCKING.has(s.name)).map((s) => s.id));
  const spared = (hit: TimelineHit) =>
    hit.hp === 0 && hit.overkill > 0 && !died(hit) && !hit.statuses.some((id) => blocking.has(id));
  // What other groups' kills say an attack does to each role, done right:
  // nothing to a role it never hits there.
  const role = new Map(timeline.players.map((p) => [p.id, p.role]));
  const kills = timeline.clearsFrom === 'kills' ? (timeline.clears ?? []) : [];
  const inKills = referenceDamage(kills, [...usual.keys()]);
  const usualOf = (hit: TimelineHit) => {
    const own = usual.get(nameOf(hit)) ?? Infinity;
    if (!kills.length) return own;
    const ref = inKills[nameOf(hit)];
    return Math.min(own, ref?.byRole[role.get(hit.target) ?? ''] ?? 0);
  };
  const failed = (hit: TimelineHit) => {
    const max = maxHp.get(hit.target);
    const damage = unmitigated(hit);
    if (!max || damage <= max || damage <= FAILED_TIMES * usualOf(hit)) return false;
    return damage >= UNSURVIVABLE * max || died(hit);
  };
  // What the attack usually does to their role (else to anyone), but for failed hits.
  const usualFor = (hit: TimelineHit) => {
    const fine = hits.filter((h) => nameOf(h) === nameOf(hit) && !failed(h));
    const theirs = fine.filter((h) => role.get(h.target) === role.get(hit.target));
    return (theirs.length ? theirs : fine).length ? median((theirs.length ? theirs : fine).map(unmitigated)) : 0;
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
    const wipe = enrage(kind, group.hits, unmitigated);
    return {
      id,
      at: group.at,
      action: group.action,
      name: actionName.get(group.action) ?? 'Unknown',
      kind,
      // One attack: one damage type.
      damageType: group.hits[0].damageType,
      hits: byPlayer(
        group.hits.map((hit) => {
          const leavesOneHp = spared(hit);
          // Past a completed wipe's end, nobody of theirs played it: never
          // failed. One the other group failed lands as the attack usually
          // does instead, as if done right.
          const completed = hit.at > completedAfter && !blocked.has(hit);
          const fails = !completed && !leavesOneHp && failed(hit);
          return {
            player: hit.target,
            unmitigated: completed && failed(hit) ? usualFor(hit) : unmitigated(hit),
            asPlayed: hit.amount,
            ...(fails ? { failed: true } : {}),
            ...(leavesOneHp ? { leavesOneHp: true as const } : {}),
            ...(blocked.has(hit)
              ? { estimated: fromClears.has(hit) ? ('clears' as const) : ('pull' as const) }
              : hit.at > completedAfter
                ? { estimated: 'completion' as const }
                : {}),
            avoidable: !!wipe || (fails && (ignore || unsurvivable(hit))),
          };
        }),
      ),
      ...(wipe ? { wipe } : {}),
    };
  });
}

// A mechanic's hits with each player's hits as one: an attack that hits a
// player twice (Mistral Song) takes the sum, as the HP they have then must
// last through both. Judged one by one, each looked survivable while the
// two together killed. Hits that differ in what they are (one failed, one
// estimated...) stay apart.
function byPlayer(hits: MechanicHit[]): MechanicHit[] {
  const merged: MechanicHit[] = [];
  const kind = (h: MechanicHit) => JSON.stringify({ ...h, player: 0, unmitigated: 0, asPlayed: 0 });
  for (const hit of hits) {
    const same = merged.find((m) => m.player === hit.player && kind(m) === kind(hit));
    if (same)
      Object.assign(same, { unmitigated: same.unmitigated + hit.unmitigated, asPlayed: same.asPlayed + hit.asPlayed });
    else merged.push({ ...hit });
  }
  return merged;
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
