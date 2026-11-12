import type { PullTimeline } from '@everise/core/api-types';
import { fitsPool, fitsRecast, isAway } from './coverage';
import type { MpModel } from './mp';
import { BLACKEST_NIGHT } from './dark-arts';
import type { MitigationTool, Plan, PlannedUse } from './plan.model';
import type { Weaving } from './weaving';

// The tanks' cooldowns that also go on the boss's auto-attacks, whenever
// they're ready and no mechanic needs them: the short ones (The Blackest
// Night, Holy Sheltron or Sheltron, Heart of Corundum or Heart of Stone,
// Bloodwhetting or Raw Intuition, Oblation), and the bigger ones that work
// on physical hits (Rampart, Reprisal, Guardian or Sentinel, Bulwark,
// Damnation or Vengeance, Shadowed Vigil or Shadow Wall, Great Nebula or
// Nebula, Camouflage).
const SHORT = [BLACKEST_NIGHT, 25746, 3542, 25758, 16161, 25751, 3551, 25754];
const BIG = [7531, 7535, 36920, 17, 22, 36923, 44, 36927, 3636, 36935, 16148, 16140];
const ON_AUTOS = new Set([...SHORT, ...BIG]);
// One is worth it on at least this many autos in its time (The Blackest
// Night wherever it breaks).
const MIN_AUTOS = 2;
// It goes up this long before the first, at the latest weave slot then.
const BEFORE_MS = 3_000;

// When each player takes the boss's auto-attacks (the pull's, and past a
// completed wipe's wipe point the kill's).
export function autoTimes(timeline: PullTimeline): Map<number, number[]> {
  const named = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const times = new Map<number, number[]>();
  for (const hit of timeline.damage) {
    if (hit.tick || named.get(hit.action)?.toLowerCase() !== 'attack') continue;
    times.set(hit.target, [...(times.get(hit.target) ?? []), hit.at]);
  }
  for (const list of times.values()) list.sort((a, b) => a - b);
  return times;
}

// A replanned tank's cooldowns on the autos they take, whenever it's
// ready, after the mechanics have theirs: its recast and gauge (Holy
// Sheltron's Oath) leave room for every use already planned, later ones
// too, so it never takes one from a mechanic. The Blackest Night only
// where the autos break it, and where the Dark Knight has the MP for it
// (`MpModel.affordable`, upkeep): Dark Arts then gives it back.
export function autoCooldowns(
  plan: Plan,
  tools: MitigationTool[],
  autos: Map<number, number[]>,
  weaving: Weaving,
  mp?: MpModel,
): PlannedUse[] {
  const added: PlannedUse[] = [];
  const all = () => [...plan.uses, ...added];
  const toolOf = new Map(tools.map((t) => [`${t.player}:${t.action}`, t]));
  const of = (u: PlannedUse) => toolOf.get(`${u.player}:${u.action}`);
  for (const t of tools.filter((o) => ON_AUTOS.has(o.action))) {
    const lasts = Math.max(...t.effects.map((e) => e.durationMs));
    const hits = autos.get(t.player) ?? [];
    const target = t.effects.some((e) => e.target === 'target') ? t.player : null;
    let next = -Infinity;
    for (const first of hits) {
      if (first < next) continue;
      const own = all().filter((u) => u.player === t.player);
      const occupied = own.map((u) => ({ at: u.at, gcd: !!of(u)?.gcd, castMs: of(u)?.castMs ?? 0 }));
      const at = weaving.ogcdBefore(t.player, first, first - BEFORE_MS, occupied);
      if (at === null || at < 0 || isAway(t, at)) continue;
      const few = hits.filter((h) => h >= at && h <= at + lasts).length < MIN_AUTOS;
      if (few && t.action !== BLACKEST_NIGHT) continue;
      const times = all()
        .filter((u) => u.player === t.player && of(u)?.group === t.group)
        .map((u) => u.at);
      if (!fitsRecast(times, at, t.recastMs, t.charges)) continue;
      const pool = t.pool;
      const spent = pool ? own.filter((u) => of(u)?.pool?.name === pool.name).map((u) => u.at) : [];
      if (pool && !fitsPool(spent, at, pool)) continue;
      if (mp && !mp.affordable(t.player, t.action, at, own, 'upkeep', target ?? t.player)) continue;
      added.push({ player: t.player, action: t.action, name: t.name, at, target, covers: [] });
      next = at + (pool ? lasts : t.recastMs / t.charges);
    }
  }
  return added;
}
