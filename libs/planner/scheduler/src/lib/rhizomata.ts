import { poolLevel } from './coverage';
import type { CatalogAction } from '@everise/core/api-types';
import type { PlannedUse, ToolPool } from './plan.model';
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
