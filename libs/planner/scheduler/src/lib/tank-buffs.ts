import { fitsPool, fitsRecast, isAway } from './coverage';
import type { TimelinePlayer } from '@everise/core/api-types';
import type { HealTool, PlannedUse } from './plan.model';
import type { Mechanic } from './mechanic.model';
import type { Weaving } from './weaving';
import type { Spent } from './heal-plan.model';

// The healing buffs a healer puts on a tank, with no heal of their own: an
// astrologian's the Arrow (healing received +10% for 15s) and a scholar's
// Protraction (max HP and healing received +10% for 10s). In 54 kills' logs,
// 83 of 110 Arrows went on a tank, and scholars cast Protraction 153 times;
// the plan had kept them as played. As each card comes, or the recast
// allows, one goes on the tank taking the biggest hit within `WITHIN_MS`,
// in a weave slot up to `WINDOW_MS` before it: the heals after it count it.
// Protraction goes in last (`LAST`, with the aimed heals), in the weave
// slots the heals leave: placed first, it took the ones a scholar short of
// them needed (two deaths in a Dancing Mad kill). Its boost isn't counted.
// An astrologian, busy with their damage too, plays the Arrow only where the
// tank takes the most: at least `ARROW_LOAD` times their max HP of the
// mechanics' damage (unmitigated) in its 15s. In 88 kills' logs, the Arrow
// came from 114 of 223 Astral Draws, little more often before heavy tank
// damage; played with every card, the plan had 271 (now 111).
export const TANK_BUFFS = new Set([37024, 25867]);
const LAST = new Set([25867]);
const WITHIN_MS = 60_000;
const LEAD_MS = 1_000;
const WINDOW_MS = 8_000;
const THE_ARROW = 37024;
const ARROW_MS = 15_000;
const ARROW_LOAD = 2.5;

// The uses, on the `players`' tanks, before the heals are planned (`last`: after); `spent` takes them.
export function tankBuffs(
  tools: HealTool[],
  spent: Spent[],
  weaving: Weaving,
  mechanics: Mechanic[],
  players: TimelinePlayer[],
  last = false,
): PlannedUse[] {
  const uses: PlannedUse[] = [];
  const tanks = new Set(players.filter((p) => p.role === 'tank').map((p) => p.id));
  // The biggest hit on a tank in each mechanic, if any.
  const tankHit = (m: Mechanic) =>
    m.hits
      .filter((h) => tanks.has(h.player) && !h.avoidable)
      .reduce<{ player: number; unmitigated: number } | null>(
        (a, h) => (!a || h.unmitigated > a.unmitigated ? h : a),
        null,
      );
  const onTanks = mechanics.filter((m) => !m.wipe && tankHit(m));
  // The mechanics' damage (unmitigated) `tank` takes from `at` for `ms`, in shares of their max HP.
  const maxHp = new Map(players.map((p) => [p.id, p.maxHp]));
  const load = (tank: number, at: number, ms: number) =>
    onTanks
      .filter((m) => m.at >= at && m.at < at + ms)
      .flatMap((m) => m.hits.filter((h) => h.player === tank && !h.avoidable))
      .reduce((sum, h) => sum + h.unmitigated, 0) / (maxHp.get(tank) || Infinity);
  for (const tool of tools.filter((t) => TANK_BUFFS.has(t.action) && LAST.has(t.action) === last)) {
    const times = (match: (s: Spent) => boolean) => spent.filter(match).map((s) => s.at);
    for (let due = 0; ;) {
      const ahead = onTanks.filter((m) => m.at - LEAD_MS >= due);
      if (!ahead.length) break;
      const m = ahead
        .filter((o) => o.at < ahead[0].at + WITHIN_MS)
        .reduce((a, b) => ((tankHit(b)?.unmitigated ?? 0) > (tankHit(a)?.unmitigated ?? 0) ? b : a));
      const latest = m.at - LEAD_MS;
      const own = spent.filter((s) => s.player === tool.player);
      const at = weaving.ogcdBefore(tool.player, latest, Math.max(due, latest - WINDOW_MS), own);
      const { pool } = tool;
      if (
        at === null ||
        isAway(tool, at) ||
        !fitsRecast(
          times((s) => s.group === tool.group),
          at,
          tool.recastMs,
          tool.charges,
        ) ||
        (pool &&
          !fitsPool(
            times((s) => s.player === tool.player && s.pool?.name === pool.name),
            at,
            pool,
          ))
      ) {
        due = m.at;
        continue;
      }
      const target = tankHit(m)?.player ?? null;
      if (tool.action === THE_ARROW && target !== null && load(target, at, ARROW_MS) < ARROW_LOAD) {
        due = m.at;
        continue;
      }
      uses.push({ player: tool.player, action: tool.action, name: tool.name, at, target, covers: [] });
      const { player, action, group, gcd, castMs } = tool;
      spent.push({ player, action, at, group, pool, gcd, castMs });
      due = at + Math.max(tool.recastMs, 1);
    }
  }
  return uses;
}
