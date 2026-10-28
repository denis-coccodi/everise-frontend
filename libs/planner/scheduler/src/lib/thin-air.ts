import type { CatalogAction, PullTimeline } from '@everise/core/api-types';
import { fitsRecast } from './coverage';
import type { PlannedUse } from './plan.model';
import { WEAVE_MS, type Weaving } from './weaving';

// Thin Air: the next action within 12s costs no MP; 2 charges, 60s each.
export const THIN_AIR = 7430;
export const THIN_AIR_MS = 12_000;
const RECAST_MS = 60_000;
const CHARGES = 2;
const RAISE = 125;
// Spells worth a charge: a raise, or a heal of at least this much MP.
const WORTH_MP = 1_000;
// How far before its spell a charge goes: the weave slot just before it.
const BEFORE_MS = 2_500;

// Where a replanned white mage uses Thin Air in a plan: the last charge is
// kept for each raise as played (in the weave slot before it); the other
// goes on the plan's costliest spells, right before each, so nothing else
// takes it.
export function thinAirTimes(
  player: number,
  timeline: PullTimeline,
  uses: PlannedUse[],
  weaving: Weaving,
  byId: Map<number, CatalogAction>,
): number[] {
  const own = uses.filter((u) => u.player === player);
  const occupied = own.map((u) => ({
    at: u.at,
    gcd: !!byId.get(u.action)?.gcd,
    castMs: byId.get(u.action)?.castMs ?? 0,
  }));
  const costOf = (action: number) => byId.get(action)?.mpCost ?? 0;
  // Every spell that costs MP, planned or as played, for nothing to come
  // between a charge and its spell.
  const spells = [
    ...own.map((u) => ({ at: u.at, action: u.action })),
    ...timeline.playerCasts.filter((c) => c.source === player).map((c) => ({ at: c.at, action: c.action })),
  ].filter((s) => costOf(s.action) > 0);
  const times: number[] = [];
  const place = (at: number) => {
    const taken = [...occupied, ...times.map((t) => ({ at: t, gcd: false, castMs: 0 }))];
    const slot = weaving.ogcdBefore(player, at - WEAVE_MS, at - BEFORE_MS, taken);
    if (slot === null || slot < 0 || !fitsRecast(times, slot, RECAST_MS, CHARGES)) return;
    if (spells.some((s) => s.at > slot && s.at < at)) return;
    times.push(slot);
  };
  const raises = timeline.playerCasts.filter((c) => c.source === player && c.action === RAISE);
  for (const raise of raises) place(raise.at);
  const worth = own
    .filter((u) => byId.get(u.action)?.gcd && costOf(u.action) >= WORTH_MP)
    .sort((a, b) => costOf(b.action) - costOf(a.action) || a.at - b.at);
  for (const spell of worth) place(spell.at);
  return times.sort((a, b) => a - b);
}

export function thinAirUse(player: number, at: number): PlannedUse {
  return { player, action: THIN_AIR, name: 'Thin Air', at, target: null, covers: [] };
}
