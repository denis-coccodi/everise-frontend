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

// When a use could go up for `m`: as late as it can, and earlier where its
// window would also catch an earlier mechanic.
export function momentsFor(m: Mechanic, t: MitigationTool, mechanics: Mechanic[]) {
  const duration = Math.min(...t.effects.map((e) => e.durationMs));
  const latest = m.at - LEAD_MS;
  const earliest = Math.max(0, m.at - duration);
  const moments = new Set([latest]);
  for (const other of mechanics) {
    const at = other.at - LEAD_MS;
    if (at >= earliest && at < latest) moments.add(at);
  }
  return [...moments].filter((at) => at >= 0);
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
) {
  if (!t.effects.length || !t.effects.every((e) => e.target === 'self')) return false;
  const theirs = (o: Mechanic) => o.hits.find((h) => h.player === t.player && !h.avoidable);
  const here = theirs(m);
  if (!here) return false;
  return pending.some((o) => {
    const hit = theirs(o);
    return o !== m && !!hit && Math.abs(o.at - m.at) < t.recastMs && weight(o, hit) > weight(m, here);
  });
}
