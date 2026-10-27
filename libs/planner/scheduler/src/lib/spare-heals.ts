import { fitsPool, fitsRecast, isAway, poolLevel } from './coverage';
import { cutsUnion } from './fairy-heals';
import { Favour, HealTool, PlannedUse } from './plan.model';
import { Weaving } from './weaving';
import type { Spent } from './heal-plan.model';
import type { HpEvent } from './hp-track.model';

// The heals used on cooldown whether or not anyone needs them: Assize (its
// damage), Celestial Opposition (a strong heal on a short cooldown), Lux
// Solaris (free, in each Refulgent Lux).
const ON_COOLDOWN = new Set([3571, 16553, 36997]);
// How finely the pass looks for the next moment a use fits.
const STEP_MS = 500;
// Afflatus Misery, an instant GCD of damage the white mage casts when the
// Blood Lily is in full bloom: after three lilies spent.
export const MISERY = { action: 16535, name: 'Afflatus Misery' };
const MISERY_CAST_MS = 0;
const BLOOM = 3;

// What the healers use after the heals the hits need, as their guides have
// them: each heal that goes on cooldown, as often as its recast allows, in
// the weave slots left; a white mage's Afflatus Misery whenever the Blood
// Lily is in full bloom (at the pull, then three lilies later), before any
// lily that would go to waste on it; and, for one favouring damage, the lily
// that would overcap (Afflatus Rapture, or Solace on themselves), whenever
// the third one comes in, so the Blood Lily charges the next Misery. Two
// stay for the heals. `spent` takes the uses.
export function spareHeals(
  tools: HealTool[],
  spent: Spent[],
  weaving: Weaving,
  durationMs: number,
  favourOf: (player: number) => Favour,
  eventsFor: (tool: HealTool, use: PlannedUse) => HpEvent[],
): { uses: PlannedUse[]; events: HpEvent[] } {
  const uses: PlannedUse[] = [];
  const events: HpEvent[] = [];
  const add = (tool: HealTool, at: number, target: number | null, overcap = false) => {
    const use: PlannedUse = { player: tool.player, action: tool.action, name: tool.name, at, target, covers: [] };
    if (overcap) use.overcap = true;
    uses.push(use);
    events.push(...eventsFor(tool, use));
    const { player, action, group, pool, gcd, castMs } = tool;
    spent.push({ player, action, at, group, pool, gcd, castMs });
  };
  const occupied = (player: number) => spent.filter((s) => s.player === player);
  const groupTimes = (group: string) => spent.filter((s) => s.group === group).map((s) => s.at);

  for (const tool of tools.filter((t) => ON_COOLDOWN.has(t.action) && !t.gcd)) {
    for (let t = 0; t < durationMs;) {
      const at = weaving.ogcdAfter(tool.player, t, durationMs, occupied(tool.player));
      if (at === null) break;
      const timesOf = (action: number) =>
        spent.filter((x) => x.player === tool.player && x.action === action).map((x) => x.at);
      if (
        !isAway(tool, at) &&
        !cutsUnion(tool.action, at, timesOf) &&
        fitsRecast(groupTimes(tool.group), at, tool.recastMs, tool.charges)
      ) {
        add(tool, at, null);
        t = at + tool.recastMs;
      } else {
        // From when the uses in its way have come back.
        const blocking = groupTimes(tool.group).filter((g) => Math.abs(g - at) < tool.recastMs);
        t = Math.max(at + STEP_MS, ...blocking.map((g) => g + tool.recastMs));
      }
    }
  }

  // Each white mage's lily heal: the party one if they have it.
  const lilies = new Map<number, HealTool>();
  for (const tool of tools) {
    if (tool.pool?.name !== 'Lily') continue;
    const had = lilies.get(tool.player);
    if (!had || tool.effects.some((e) => e.target === 'party')) lilies.set(tool.player, tool);
  }
  for (const tool of lilies.values()) {
    const pool = tool.pool;
    if (!pool) continue;
    const { player } = tool;
    const used = () => spent.filter((s) => s.player === player && s.pool?.name === pool.name).map((s) => s.at);
    // An opener's (spent already) first.
    const opened = spent.filter((s) => s.player === player && s.action === MISERY.action).map((s) => s.at);
    const miseries = [...opened];
    // The Blood Lily is in full bloom at the pull (since 7.4), for the
    // opener's Misery when it has one, and again three lilies after each
    // Misery; one spent while it is goes to waste.
    const bloomed = (t: number) => {
      const last = miseries.filter((m) => m <= t).at(-1);
      if (last === undefined) return !opened.length;
      return used().filter((u) => u > last && u <= t).length >= BLOOM;
    };
    for (let t = 0; t < durationMs; t += STEP_MS) {
      if (bloomed(t)) {
        const at = weaving.gcdAfter(player, t, t + pool.gainMs, MISERY_CAST_MS, occupied(player));
        if (at === null) continue;
        miseries.push(at);
        uses.push({ player, action: MISERY.action, name: MISERY.name, at, target: null, covers: [], damage: true });
        spent.push(miserySpent(player, at));
        t = at;
        continue;
      }
      // No lily for damage before the opener's Miseries: the guides spend
      // the first when healing needs it, after them.
      if (t < Math.max(0, ...opened)) continue;
      if (favourOf(player) !== 'dps' || poolLevel(used(), t, pool) < pool.max) continue;
      const at = weaving.gcdAfter(player, t, t + pool.gainMs, tool.castMs, occupied(player));
      if (at === null || !fitsPool(used(), at, pool)) continue;
      const party = tool.effects.some((e) => e.target === 'party');
      add(tool, at, party ? null : player, true);
      t = at;
    }
  }
  return { uses, events };
}

// What an Afflatus Misery takes: a GCD, and the Blood Lily.
export function miserySpent(player: number, at: number): Spent {
  return {
    player,
    action: MISERY.action,
    at,
    group: `${player}:misery`,
    pool: null,
    gcd: true,
    castMs: MISERY_CAST_MS,
  };
}
