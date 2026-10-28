import type { CatalogAction } from '@everise/core/api-types';
import type { MpModel } from './mp';
import type { PlannedUse } from './plan.model';
import type { Weaving } from './weaving';

export const LUCID_DREAMING = 7562;
const LUCID_MS = 60_000;
// The guides use it once MP drops below about 8,000: lower, and its 3,850
// MP would come too late; higher, and some of it would overcap.
const BELOW = 8_000;

// Where a replanned healer uses Lucid Dreaming in a plan: whenever their MP
// with the plan's `uses` drops below 8,000, as soon as its recast allows, in
// the first weave slot from then. Each one's MP counts for the next.
export function lucidTimes(
  player: number,
  mp: MpModel,
  uses: PlannedUse[],
  weaving: Weaving,
  byId: Map<number, CatalogAction>,
  durationMs: number,
): number[] {
  const own = uses.filter((u) => u.player === player);
  const occupied = own.map((u) => ({
    at: u.at,
    gcd: !!byId.get(u.action)?.gcd,
    castMs: byId.get(u.action)?.castMs ?? 0,
  }));
  const times: number[] = [];
  let ready = 0;
  for (;;) {
    const lucids = times.map((at) => ({ action: LUCID_DREAMING, at }));
    const low = mp.curve(player, [...own, ...lucids]).find((c) => c.at >= ready && c.mp < BELOW);
    if (!low) break;
    const taken = [...occupied, ...times.map((at) => ({ at, gcd: false, castMs: 0 }))];
    const at = weaving.ogcdAfter(player, low.at, durationMs, taken);
    if (at === null) break;
    times.push(at);
    ready = at + LUCID_MS;
  }
  return times;
}

export function lucidUse(player: number, at: number): PlannedUse {
  return { player, action: LUCID_DREAMING, name: 'Lucid Dreaming', at, target: null, covers: [] };
}
