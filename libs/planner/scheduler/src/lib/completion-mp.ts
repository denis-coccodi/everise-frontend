import type { ActionCatalog, PullTimeline, TimelineCast, TimelinePlayer } from '@everise/core/api-types';
import { upkeepCasts } from './completion-upkeep';
import { LUCID_DREAMING } from './lucid';
import { TICK_MS, tickOf } from './mp';
import type { PastWipePoint } from './mp.model';
import type { PlannedUse } from './plan.model';
import type { ReferencedTimeline } from './reference-damage.model';

// A player acting this long after a death was raised.
const RAISED_MS = 1_000;
// A GCD's length when the log has too few to tell, and the range a
// measured one is kept in.
const GCD_MS = 2_500;
const MIN_GCD_MS = 1_500;
const MAX_GCD_MS = 3_500;
// How often a Dark Knight pays for an Edge or Flood of Shadow, when the
// log has too few to tell, and the range a measured one is kept in: real
// dark knights use about 3.5 a minute, but only about 2.2 cost MP (the
// rest are Dark Arts', from a broken Blackest Night, which the plan gives).
const SPENDER_MS = 27_000;
const MIN_SPENDER_MS = 22_000;
const MAX_SPENDER_MS = 40_000;
// One paid for: the log's MP dropped by most of its cost.
const PAID = 0.8;
// An Edge's MP shows this soon after its cast, as the log has it.
const SPENT_MS = 100;
// A tooltip that starts like this is an attack's.
const ATTACK = /^(Deals|Delivers)\b/;

// A player's MP past a completed wipe's wipe point (`from`), when nobody of
// their job in the kill gives it: from where it stood then (for one lying
// dead, where it stood before they died: the MP model takes the first
// reading after a death as the raise, and a plan that keeps them alive
// gives that back), back at their own tick, less what their damage spells
// cost and plus what their attacks give back (a healer's 400 MP Fall
// Malefic each GCD; a Dark Knight's Syphon Strike and Carve and Spit, 600
// each), at their own pace, as their log before the wipe point has them.
// An oGCD attack that spends MP (Edge or Flood of Shadow, 3,000) comes as
// played (`casts`), as often as they used it, so the plan can drop one for
// The Blackest Night as it does a log's. The plan's uses spend and gain on
// top (Delirium, a healer's GCD heals, Lucid Dreaming). Not floored at 0:
// below it is MP they'd lack without the plan's Lucid Dreaming.
export function mpPastWipePoint(
  wipe: PullTimeline,
  player: TimelinePlayer,
  from: number,
  end: number,
  catalog: ActionCatalog,
): { mp: { at: number; mp: number }[]; casts: TimelineCast[] } {
  const max = player.maxMp;
  if (!max || !player.mp.length) return { mp: [], casts: [] };
  const died = wipe.deaths.filter((d) => d.player === player.id && d.at <= from).at(-1);
  const raised =
    died && wipe.playerCasts.some((c) => c.source === player.id && c.at > died.at + RAISED_MS && c.at <= from);
  const tick = tickOf(player.mp);
  const down = died && !raised;
  const { perGcd, gcdMs, spender } = ownPace(wipe, player, from, catalog, max);
  const events: { at: number; mp: number }[] = [];
  for (let at = from + TICK_MS; at <= end; at += TICK_MS) events.push({ at, mp: tick });
  if (perGcd) for (let at = from + gcdMs; at <= end; at += gcdMs) events.push({ at, mp: -perGcd });
  const casts: TimelineCast[] = [];
  if (spender)
    for (let at = from + spender.every; at <= end; at += spender.every) {
      casts.push({ at, source: player.id, target: null, action: spender.action, castMs: null });
      events.push({ at: at + SPENT_MS, mp: -spender.cost });
    }
  let mp = [...player.mp].reverse().find((r) => r.at <= from && (!down || r.mp > 0))?.mp ?? max;
  const readings = [{ at: from + 1, mp }];
  for (const e of events.sort((a, b) => a.at - b.at)) {
    mp = Math.min(max, mp + e.mp);
    // Full and nothing spent: nothing to say.
    if (e.mp > 0 && mp === max && readings[readings.length - 1].mp === max) continue;
    readings.push({ at: e.at, mp });
  }
  return { mp: readings, casts };
}

// What the MP model makes up past a completed wipe's wipe point, where no
// log has the players' MP: the upkeep of those planned from there
// (`upkeep`); for those replanned from the start (`fromStart`), what their
// plan already has there that gives MP (`planned`: a scholar's opener
// Aetherflows) and a Lucid Dreaming each minute until the plan places its
// own; and each player's damage spells' MP a GCD (their pace before it).
export function pastWipePoint(
  timeline: ReferencedTimeline,
  catalog: ActionCatalog,
  upkeep: TimelineCast[],
  fromStart: number[],
  planned: PlannedUse[],
): PastWipePoint {
  const from = timeline.completion?.from;
  if (from === undefined) return { from: Infinity, unlogged: [], perGcd: new Map() };
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const gives = (action: number) => !!byId.get(action)?.effects.some((e) => e.kind === 'mp' || e.kind === 'mpRegen');
  const own = planned
    .filter((u) => u.at > from && fromStart.includes(u.player) && gives(u.action))
    .map((u) => ({ at: u.at, source: u.player, target: null, action: u.action, castMs: null }));
  const theirs = new Map(fromStart.map((p) => [p, from]));
  const lucids = upkeepCasts(timeline, theirs, catalog).filter((c) => c.action === LUCID_DREAMING);
  const pace = (p: TimelinePlayer) => (p.maxMp ? ownPace(timeline, p, from, catalog, p.maxMp).perGcd : 0);
  return {
    from,
    unlogged: [...upkeep, ...own, ...lucids],
    perGcd: new Map(timeline.players.map((p) => [p.id, pace(p)])),
  };
}

// From a player's casts up to `until`: what their GCDs cost them on
// average (their damage spells' MP, less what their attacks give back),
// how long their GCD is, and the oGCD attack that spends MP (Edge of
// Shadow) with its cost and how often they used it.
function ownPace(wipe: PullTimeline, player: TimelinePlayer, until: number, catalog: ActionCatalog, max: number) {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const own = wipe.playerCasts.filter((c) => c.source === player.id && c.at <= until).sort((a, b) => a.at - b.at);
  const gcds = own.filter((c) => byId.get(c.action)?.gcd);
  const attack = (id: number) => {
    const a = byId.get(id);
    return !!a && !a.effects.some((e) => e.kind !== 'mp') && ATTACK.test(a.description ?? '');
  };
  const gain = (id: number) =>
    (byId.get(id)?.effects ?? [])
      .filter((e) => e.kind === 'mp')
      .reduce((sum, e) => sum + (e.percent !== null ? (e.percent / 100) * max : (e.potency ?? 0)), 0);
  let net = 0;
  for (const c of own) {
    if (!attack(c.action)) continue;
    if (byId.get(c.action)?.gcd) net += byId.get(c.action)?.mpCost ?? 0;
    net -= gain(c.action);
  }
  const gaps = gcds
    .slice(1)
    .map((c, i) => c.at - gcds[i].at)
    .filter((g) => g >= MIN_GCD_MS && g <= MAX_GCD_MS)
    .sort((a, b) => a - b);
  const costOf = (id: number) => byId.get(id)?.mpCost ?? 0;
  const paid = (c: TimelineCast) => {
    const before = [...player.mp].reverse().find((r) => r.at <= c.at)?.mp;
    const after = player.mp.find((r) => r.at > c.at && r.at - c.at < TICK_MS)?.mp;
    return before !== undefined && after !== undefined && before - after >= PAID * costOf(c.action);
  };
  // Their paid oGCD attacks (Edges of Shadow), not Dark Arts' free ones.
  const spends = own.filter((c) => attack(c.action) && !byId.get(c.action)?.gcd && costOf(c.action) > 0 && paid(c));
  const first = spends[0];
  // The gap between their first and last, else the usual.
  const measured = spends.length > 1 ? (spends[spends.length - 1].at - first.at) / (spends.length - 1) : SPENDER_MS;
  const spender = first
    ? {
        action: first.action,
        cost: costOf(first.action),
        every: Math.min(MAX_SPENDER_MS, Math.max(MIN_SPENDER_MS, measured)),
      }
    : null;
  return { perGcd: gcds.length ? net / gcds.length : 0, gcdMs: gaps[gaps.length >> 1] ?? GCD_MS, spender };
}
