import { poolLevel } from './coverage';
import type { CatalogAction } from '@everise/core/api-types';
import type { Mechanic, PlannedUse, ToolPool } from './plan.model';
import type { Occupied } from './weaving.model';
import type { Weaving } from './weaving';

export const RHIZOMATA = 24309;
const RHIZOMATA_MS = 90_000;
// The guides use it below two stacks: at two, its third resets the gauge's
// timer, wasting most of a stack.
const LOW = 2;

// Where a sage uses Rhizomata in a plan: once its heals (`spends`, the
// Addersgall uses' times) leave the gauge below two stacks, as soon as its
// recast allows, in the first weave slot from then (`occupied`: what the
// plan already has them use). Each one's stack counts for the uses after.
export function rhizomataTimes(
  sage: number,
  pool: ToolPool,
  spends: number[],
  weaving: Weaving,
  occupied: Occupied[],
  durationMs: number,
): number[] {
  const times: number[] = [];
  let ready = 0;
  const sorted = [...spends].sort((a, b) => a - b);
  for (const spend of sorted) {
    if (spend < ready) continue;
    const before = sorted.filter((t) => t <= spend);
    if (poolLevel(before, spend + 1, { ...pool, bonus: times }) >= LOW) continue;
    const taken = [...occupied, ...times.map((at) => ({ at, gcd: false, castMs: 0 }))];
    const at = weaving.ogcdAfter(sage, spend, durationMs, taken);
    if (at === null) break;
    times.push(at);
    ready = at + RHIZOMATA_MS;
  }
  return times;
}

// A sage's Rhizomata in a plan's `uses` (see rhizomataTimes), from their
// Addersgall `tools` among those given.
export function rhizomataOf(
  sage: number,
  uses: PlannedUse[],
  tools: { player: number; action: number; pool: ToolPool | null }[],
  weaving: Weaving,
  byId: Map<number, CatalogAction>,
  durationMs: number,
): number[] {
  const mine = tools.filter((t) => t.player === sage && t.pool?.name === 'Addersgall');
  const pool = mine[0]?.pool;
  if (!pool) return [];
  const actions = new Set(mine.map((t) => t.action));
  const own = uses.filter((u) => u.player === sage);
  const spends = own.filter((u) => actions.has(u.action)).map((u) => u.at);
  const occupied = own.map((u) => ({
    at: u.at,
    gcd: !!byId.get(u.action)?.gcd,
    castMs: byId.get(u.action)?.castMs ?? 0,
  }));
  return rhizomataTimes(sage, pool, spends, weaving, occupied, durationMs);
}

// The tools with each sage's Rhizomata stacks (`bonus`, by player) in their
// Addersgall.
export function withRhizomata<T extends { player: number; pool: ToolPool | null }>(
  tools: T[],
  bonus: Map<number, number[]>,
): T[] {
  return tools.map((t) => {
    const times = bonus.get(t.player);
    return times?.length && t.pool?.name === 'Addersgall' ? { ...t, pool: { ...t.pool, bonus: times } } : t;
  });
}

export const rhizomataUse = (player: number, at: number): PlannedUse => ({
  player,
  action: RHIZOMATA,
  name: 'Rhizomata',
  at,
  target: null,
  covers: [],
  refill: true,
});

// How soon before a heavy mechanic the logs' sages use Rhizomata, mostly:
// right after spending into a hit, for the next (64% within 15s of a raidwide).
const BEFORE_HEAVY_MS = 15_000;

// Of each sage's Rhizomata `times`, the ones a heavy mechanic follows soon.
export function beforeHeavy(times: Map<number, number[]>, mechanics: Mechanic[], heavy: Set<number>) {
  const soon = (at: number) => mechanics.some((m) => heavy.has(m.id) && m.at > at && m.at - at <= BEFORE_HEAVY_MS);
  return new Map([...times].map(([sage, list]) => [sage, list.filter(soon)]));
}

// How far the damage counts toward a stretch Rhizomata goes before.
const STRETCH_MS = 30_000;
// A big hit: one taking half its target's max HP or more, before mitigation.
const BIG_SHARE = 0.5;

// Where a sage uses Rhizomata from the damage ahead rather than the gauge:
// before the heaviest stretches first (the big hits' damage, as shares of
// their targets' max HP, over the 30s from one), in the first weave slot
// of the 15s before it (`occupied`: what the plan has them use), each 90s
// from the others.
export function rhizomataAhead(
  sage: number,
  mechanics: Mechanic[],
  maxHp: Map<number, number>,
  weaving: Weaving,
  occupied: Occupied[],
  durationMs: number,
): number[] {
  const shareOf = (m: Mechanic) =>
    m.hits
      .filter((h) => !h.avoidable)
      .map((h) => h.unmitigated / (maxHp.get(h.player) ?? Infinity))
      .filter((s) => s >= BIG_SHARE);
  const big = mechanics.filter((m) => m.at <= durationMs && shareOf(m).length);
  const weight = (m: Mechanic) =>
    big
      .filter((o) => o.at >= m.at && o.at < m.at + STRETCH_MS)
      .reduce((sum, o) => sum + shareOf(o).reduce((a, b) => a + b, 0), 0);
  const times: number[] = [];
  for (const m of [...big].sort((a, b) => weight(b) - weight(a) || a.at - b.at)) {
    const from = Math.max(m.at - BEFORE_HEAVY_MS, 0);
    if (from >= m.at) continue;
    const taken = [...occupied, ...times.map((at) => ({ at, gcd: false, castMs: 0 }))];
    const at = weaving.ogcdAfter(sage, from, m.at - 1, taken);
    if (at === null || times.some((t) => Math.abs(t - at) < RHIZOMATA_MS)) continue;
    times.push(at);
  }
  return times.sort((a, b) => a - b);
}
