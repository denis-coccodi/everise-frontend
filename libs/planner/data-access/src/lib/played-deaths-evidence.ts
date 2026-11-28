import type { ActionCatalog, PullTimeline, TimelineHit } from '@everise/core/api-types';
import type { ReferencedTimeline } from '@everise/planner/scheduler';

// What the log says around a death, for working out why it happened
// (played-deaths.ts). Every rule here reads the pull itself, or other
// groups' kills of its fight when the planner loaded them.

// Hits of one attack this close together are one use of it (both stacks of
// a light-party stack land at once).
const SAME_USE_MS = 1_000;
// A player is back once they act or are acted on this long after dying.
const BACK_MS = 1_000;
// A status counts as usually up for an attack when it was on at least this
// share of its other hits.
const USUALLY_UP = 0.6;
// A player is someone's usual partner for an attack when hit with them by
// at least this share of its uses.
const USUALLY_TOGETHER = 0.6;
// Hits of one attack less than this apart are one set of it (a set of
// towers landing one after the other).
const SET_GAP_MS = 2_500;
// A punishment comes this soon after the mechanic that was missed.
const PUNISHED_WITHIN_MS = 12_000;

const VULNERABILITY = /vulnerability up/i;

// Whether a player was alive at `at`: never died before it, or did or took
// something after their last death (a raise brought them back).
export function aliveAt(timeline: PullTimeline, player: number, at: number): boolean {
  const died = timeline.deaths.filter((d) => d.player === player && d.at < at).at(-1);
  if (!died) return true;
  const after = (t: number) => t > died.at + BACK_MS && t < at;
  return (
    timeline.playerCasts.some((c) => c.source === player && after(c.at)) ||
    timeline.heals.some((h) => h.target === player && after(h.at) && h.amount > 0)
  );
}

// How many players each use of an attack hits when nothing goes wrong: the
// most common count over its uses in the pull and in the pulls the planner
// loaded to complete it (other groups' kills, or the report's own pulls
// that got further) where nobody died to it, leaving out the use at
// `except`. Null when there's nothing to compare with.
// With it, what it usually does to each of them before mitigation (the
// median): a shared hit grows when fewer take it, a raidwide doesn't.
export function usualTargets(
  timeline: ReferencedTimeline,
  attack: string,
  except: number,
): { count: number; damage: number } | null {
  const uses: { count: number; damage: number[] }[] = [];
  for (const t of [timeline, ...(timeline.clears ?? [])]) {
    const names = new Map(t.actions.map((a) => [a.id, a.name]));
    for (const use of usesOf(t, (hit) => names.get(hit.action) === attack)) {
      if (t === timeline && Math.abs(use.at - except) <= SAME_USE_MS) continue;
      const killed = t.deaths.some((d) =>
        use.hits.some((h) => h.target === d.player && d.at - h.at <= 3_000 && d.at >= h.at),
      );
      if (!killed) uses.push({ count: new Set(use.hits.map((h) => h.target)).size, damage: use.hits.map(unmitigated) });
    }
  }
  const count = mostCommon(uses.map((u) => u.count));
  if (count === null) return null;
  const damage = uses
    .filter((u) => u.count === count)
    .flatMap((u) => u.damage)
    .sort((a, b) => a - b);
  return { count, damage: damage[Math.floor(damage.length / 2)] };
}

// Who usually shares an attack with the players it hit now (a tower's usual
// partner): over its other uses in the pull and the pulls loaded to
// complete it (players matched by name), how often each other player was
// hit by the same use as them, best first. Only those in at least
// `USUALLY_TOGETHER` of their other uses count.
export function usualPartners(
  timeline: ReferencedTimeline,
  attack: string,
  players: number[],
  except: number,
): number[] {
  const nameOf = new Map(timeline.players.map((p) => [p.name, p.id]));
  const together = new Map<number, number>();
  let shared = 0;
  for (const t of [timeline, ...(timeline.clears ?? [])]) {
    const names = new Map(t.actions.map((a) => [a.id, a.name]));
    const idOf = (id: number) => nameOf.get(t.players.find((p) => p.id === id)?.name ?? '');
    for (const use of usesOf(t, (hit) => names.get(hit.action) === attack)) {
      if (t === timeline && Math.abs(use.at - except) <= SAME_USE_MS) continue;
      const ids = new Set(use.hits.map((h) => idOf(h.target)).filter((id): id is number => id !== undefined));
      if (!players.some((p) => ids.has(p))) continue;
      shared++;
      for (const id of ids) if (!players.includes(id)) together.set(id, (together.get(id) ?? 0) + 1);
    }
  }
  return [...together]
    .filter(([, n]) => shared > 0 && n / shared >= USUALLY_TOGETHER)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

// An attack that only comes when something went wrong (Enuo's Big Burst, for
// an unsoaked tower): in none of the other groups' kills loaded, yet coming
// right after a shared mechanic some of its usual players were missing
// from. Those players are to blame: the ones the punishment kills are often
// the ones who did their part. Null when it isn't one, or nothing says who.
export function missedBefore(
  timeline: ReferencedTimeline,
  attack: string,
  at: number,
): { attack: string; at: number; missing: number[] } | null {
  const kills = timeline.clearsFrom === 'kills' ? (timeline.clears ?? []) : [];
  if (!kills.length) return null;
  const inKills = kills.some((k) => {
    const names = new Map(k.actions.map((a) => [a.id, a.name]));
    return k.damage.some((h) => names.get(h.action) === attack);
  });
  if (inKills) return null;
  const names = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const before = timeline.damage
    .filter((h) => !h.tick && h.at < at - SAME_USE_MS && h.at >= at - PUNISHED_WITHIN_MS)
    .map((h) => names.get(h.action))
    .filter((name): name is string => !!name && name !== attack);
  // The mechanics just before it, latest first.
  for (const name of [...new Set(before)].reverse()) {
    const sets = setsOf(timeline, name);
    const last = sets.filter((s) => s.at < at).at(-1);
    const others = sets.filter((s) => s !== last);
    if (!last || others.length < 2) continue;
    const tally = new Map<number, number>();
    for (const s of others) for (const p of s.players) tally.set(p, (tally.get(p) ?? 0) + 1);
    const missing = [...tally]
      .filter(
        ([p, n]) => n / others.length >= USUALLY_TOGETHER && !last.players.has(p) && aliveAt(timeline, p, last.at),
      )
      .map(([p]) => p);
    if (missing.length) return { attack: name, at: last.at, missing };
  }
  return null;
}

// The sets of an attack in the pull: its hits with less than `SET_GAP_MS`
// between one and the next, and who each hit.
function setsOf(timeline: PullTimeline, attack: string): { at: number; players: Set<number> }[] {
  const names = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const sets: { at: number; end: number; players: Set<number> }[] = [];
  for (const hit of timeline.damage
    .filter((h) => !h.tick && names.get(h.action) === attack)
    .sort((a, b) => a.at - b.at)) {
    const set = sets.at(-1);
    if (set && hit.at - set.end < SET_GAP_MS) {
      set.end = hit.at;
      set.players.add(hit.target);
    } else sets.push({ at: hit.at, end: hit.at, players: new Set([hit.target]) });
  }
  return sets;
}

export function unmitigated(hit: TimelineHit): number {
  return hit.unmitigated ?? hit.amount + hit.mitigated + hit.absorbed;
}

// The uses of an attack: its hits grouped by moment.
export function usesOf(t: PullTimeline, isIt: (hit: TimelineHit) => boolean): { at: number; hits: TimelineHit[] }[] {
  const uses: { at: number; hits: TimelineHit[] }[] = [];
  for (const hit of t.damage.filter((h) => !h.tick && isIt(h)).sort((a, b) => a.at - b.at)) {
    const use = uses.find((u) => hit.at - u.at <= SAME_USE_MS);
    if (use) use.hits.push(hit);
    else uses.push({ at: hit.at, hits: [hit] });
  }
  return uses;
}

// The mitigations (the catalog's) usually up when an attack hits, on the
// player or as a debuff on the enemy, that weren't for this hit, with who
// usually puts each up.
export function missingMitigations(
  timeline: PullTimeline,
  catalog: ActionCatalog,
  hit: TimelineHit,
): { status: number; by: number | null }[] {
  const mitigations = new Set(
    catalog.actions.flatMap((a) =>
      a.effects.filter((e) => e.kind === 'mitigation' && e.statusId).map((e) => e.statusId!),
    ),
  );
  const upFor = (h: TimelineHit) =>
    new Set([
      ...h.statuses,
      ...timeline.auras.filter((s) => s.target === h.source && s.from <= h.at && s.to >= h.at).map((s) => s.status),
    ]);
  const others = timeline.damage.filter((h) => h.action === hit.action && h !== hit && !h.tick);
  if (others.length < 2) return [];
  const here = upFor(hit);
  const tally = new Map<number, number>();
  for (const h of others) for (const s of upFor(h)) if (mitigations.has(s)) tally.set(s, (tally.get(s) ?? 0) + 1);
  return [...tally]
    .filter(([status, n]) => n / others.length >= USUALLY_UP && !here.has(status))
    .map(([status]) => ({ status, by: usualSource(timeline, status) }));
}

// Who put a status up most often in the pull.
function usualSource(timeline: PullTimeline, status: number): number | null {
  const sources = timeline.auras.filter((s) => s.status === status && s.source !== null).map((s) => s.source!);
  return mostCommon(sources);
}

// A Vulnerability Up on the player when a hit landed, and the hit that gave
// it to them: an earlier attack of the boss. `designed` when that attack
// gives it to whoever it hits every time (a tank buster before a swap), not
// for a mistake.
export function vulnerabilityBefore(
  timeline: PullTimeline,
  hit: TimelineHit,
): { from: TimelineHit; designed: boolean } | null {
  const names = new Map(timeline.statuses.map((s) => [s.id, s.name]));
  const vulnerable = (id: number) => VULNERABILITY.test(names.get(id) ?? '');
  const span = timeline.auras.find(
    (s) => s.target === hit.target && vulnerable(s.status) && s.from < hit.at - SAME_USE_MS && s.to >= hit.at,
  );
  if (!span) return null;
  const from = timeline.damage
    .filter((h) => h.target === hit.target && !h.tick && Math.abs(h.at - span.from) <= SAME_USE_MS)
    .at(-1);
  if (!from) return null;
  const uses = timeline.damage.filter((h) => h.action === from.action && !h.tick);
  const gaveIt = (h: TimelineHit) =>
    timeline.auras.some((s) => s.target === h.target && vulnerable(s.status) && Math.abs(s.from - h.at) <= SAME_USE_MS);
  return { from, designed: uses.length >= 2 && uses.every(gaveIt) };
}

function mostCommon<T>(values: T[]): T | null {
  const tally = new Map<T, number>();
  for (const v of values) tally.set(v, (tally.get(v) ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
