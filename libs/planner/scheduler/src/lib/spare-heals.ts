import { fitsPool, fitsRecast, poolLevel } from './coverage';
import { Favour, HealTool, PlannedUse } from './plan.model';
import { Weaving } from './weaving';
import type { Spent } from './heal-plan.model';
import type { HpEvent } from './hp-track.model';

// The heals a healer uses on cooldown whether or not anyone needs them:
// Assize (its damage), Celestial Opposition (a strong heal on a short
// cooldown).
const ON_COOLDOWN = new Set([3571, 16553]);
// How finely the pass looks for the next moment a use fits.
const STEP_MS = 500;

// What the healers use after the heals the hits need, as their guides have
// them: each heal that goes on cooldown, as often as its recast allows, in
// the weave slots left; and, for a healer favouring damage, the lily that
// would overcap (Afflatus Rapture, or Solace on themselves), whenever the
// third one comes in, so the Blood Lily charges Afflatus Misery. Two stay
// for the heals. `spent` takes the uses.
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
  const add = (tool: HealTool, at: number, target: number | null) => {
    const use: PlannedUse = { player: tool.player, action: tool.action, name: tool.name, at, target, covers: [] };
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
      if (fitsRecast(groupTimes(tool.group), at, tool.recastMs, tool.charges)) {
        add(tool, at, null);
        t = at + tool.recastMs;
      } else {
        // From when the uses in its way have come back.
        const blocking = groupTimes(tool.group).filter((g) => Math.abs(g - at) < tool.recastMs);
        t = Math.max(at + STEP_MS, ...blocking.map((g) => g + tool.recastMs));
      }
    }
  }

  // The lily heal for each healer favouring damage: the party one if they
  // have it.
  const lilies = new Map<number, HealTool>();
  for (const tool of tools) {
    if (tool.pool?.name !== 'Lily' || favourOf(tool.player) !== 'dps') continue;
    const had = lilies.get(tool.player);
    if (!had || tool.effects.some((e) => e.target === 'party')) lilies.set(tool.player, tool);
  }
  for (const tool of lilies.values()) {
    const pool = tool.pool;
    if (!pool) continue;
    const used = () => spent.filter((s) => s.player === tool.player && s.pool?.name === pool.name).map((s) => s.at);
    for (let t = 0; t < durationMs; t += STEP_MS) {
      if (poolLevel(used(), t, pool) < pool.max) continue;
      const at = weaving.gcdAfter(tool.player, t, t + pool.gainMs, tool.castMs, occupied(tool.player));
      if (at === null || !fitsPool(used(), at, pool)) continue;
      const party = tool.effects.some((e) => e.target === 'party');
      add(tool, at, party ? null : tool.player);
      t = at;
    }
  }
  return { uses, events };
}
