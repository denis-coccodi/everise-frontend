import { Mechanic, MechanicHit, MitigationTool, PlannedUse } from './plan.model';
import type { Candidate } from './mitigation-plan.model';

// A mitigation goes up at least this long before the hit it's for.
export const LEAD_MS = 500;
// Mechanics less than this apart, one after another, are a burst (Brutal
// Rain's five hits a second apart): too close to heal much between them.
export const BURST_MS = 2000;

// Each mechanic's burst, by id: the number of its first mechanic.
export function burstsOf(mechanics: Mechanic[]) {
  const burst = new Map<number, number>();
  let last: Mechanic | null = null;
  for (const m of [...mechanics].sort((a, b) => a.at - b.at)) {
    burst.set(m.id, last && m.at - last.at < BURST_MS ? (burst.get(last.id) as number) : m.id);
    last = m;
  }
  return burst;
}

// A shield or mitigation can go up in the countdown, these last seconds
// before the pull, as top groups' do (Panhaima, Haima, Galvanize up at the
// pull in half of 36 ultimate kills): one that needs no resource the pull
// gives. A second a player's, a second earlier.
const COUNTDOWN_MS = [-3_000, -4_000, -5_000, -6_000];

// Whether `t` can go up in the countdown.
export const beforePull = (t: MitigationTool) => !t.pool && !t.grantedBy;

// Tank busters this close one after another land on what the ones before
// left, where the strategy says so (`tankChains`): a tank isn't healed back
// up in between. Other hits only in a burst.
const TANK_CHAIN_MS = 6_000;

// Whether two mechanics are in one burst, and the mechanics a hit of `m`
// lands just after: its burst's before it, and with `tankChains` for a tank
// buster the tank busters within `TANK_CHAIN_MS` before it.
export function chainsOf(mechanics: Mechanic[], tankChains = false) {
  const burst = burstsOf(mechanics);
  const sameBurst = (a: Mechanic, b: Mechanic) => burst.get(a.id) === burst.get(b.id);
  const tanks = (o: Mechanic, m: Mechanic) =>
    tankChains && o.kind === 'tankbuster' && m.kind === 'tankbuster' && m.at - o.at < TANK_CHAIN_MS;
  const earlier = (m: Mechanic) => mechanics.filter((o) => o.at < m.at && (sameBurst(o, m) || tanks(o, m)));
  return { sameBurst, earlier };
}

// When a use could go up for `m`: as late as it can, and earlier where its
// window would also catch an earlier mechanic, or in the countdown where it
// still covers `m` then.
export function momentsFor(m: Mechanic, t: MitigationTool, mechanics: Mechanic[]) {
  const duration = Math.min(...t.effects.map((e) => e.durationMs));
  const latest = m.at - LEAD_MS;
  const earliest = Math.max(0, m.at - duration);
  const moments = new Set([latest]);
  for (const other of mechanics) {
    const at = other.at - LEAD_MS;
    if (at >= earliest && at < latest) moments.add(at);
  }
  for (const at of beforePull(t) ? COUNTDOWN_MS : []) if (m.at - duration <= at) moments.add(at);
  return [...moments].filter((at) => at >= 0 || COUNTDOWN_MS.includes(at));
}

// The hit of `m` the plan so far leaves taking the most of the HP it lands
// on.
export function mostEndangered(
  m: Mechanic,
  uses: PlannedUse[],
  project: (m: Mechanic, h: MechanicHit, list: PlannedUse[]) => { damage: number },
  hpOf: (m: Mechanic, h: MechanicHit) => number,
) {
  let worst: { player: number; share: number } | null = null;
  for (const hit of m.hits) {
    const share = project(m, hit, uses).damage / hpOf(m, hit);
    if (!worst || share > worst.share) worst = { player: hit.player, share };
  }
  return worst?.player ?? null;
}

export function pickBest(candidates: (Candidate | null)[]) {
  let pick: Candidate | null = null;
  for (const c of candidates) {
    if (!c) continue;
    // The most damage taken off; on a tie, the cooldown that comes back
    // soonest, keeping the long ones for later.
    if (!pick || c.value > pick.value || (c.value === pick.value && c.tool.recastMs < pick.tool.recastMs)) pick = c;
  }
  return pick;
}

// A party mitigation waits, with `partyWaits`, for a mechanic taking the
// party this many times as much.
const PARTY_BIGGER = 1.5;

// Whether a player's own cooldown (`t`, all its effects on them: Rampart)
// waits for a bigger hit on them within its recast, among the mechanics
// still to plan (`pending`), rather than go to `m`. Mechanics are planned
// by the danger to anyone, so a raidwide would take a tank's Rampart for
// their share of it before their tank buster comes up. `weight`: how much
// of the HP it lands on a hit takes.
export function waitsForBigger(
  m: Mechanic,
  t: MitigationTool,
  pending: Mechanic[],
  weight: (m: Mechanic, h: MechanicHit) => number,
  partyWaits = false,
) {
  // With `partyWaits`, one on the party or the enemies waits for a
  // mechanic taking the party `PARTY_BIGGER` times as much.
  if (partyWaits && t.effects.length && t.effects.every((e) => e.target === 'party' || e.target === 'enemies')) {
    const party = (o: Mechanic) => o.hits.filter((h) => !h.avoidable).reduce((sum, h) => sum + weight(o, h), 0);
    return pending.some((o) => o !== m && Math.abs(o.at - m.at) < t.recastMs && party(o) > PARTY_BIGGER * party(m));
  }
  if (!t.effects.length || !t.effects.every((e) => e.target === 'self')) return false;
  const theirs = (o: Mechanic) => o.hits.find((h) => h.player === t.player && !h.avoidable);
  const here = theirs(m);
  if (!here) return false;
  return pending.some((o) => {
    const hit = theirs(o);
    return o !== m && !!hit && Math.abs(o.at - m.at) < t.recastMs && weight(o, hit) > weight(m, here);
  });
}
