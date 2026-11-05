import type { CatalogAction } from '@everise/core/api-types';
import type { PlanEntry, PlanUseEntry } from './plan-log.model';

// An oGCD is woven after the GCD before it, at most a GCD's length back.
const GCD_REACH_MS = 2_500;
// A stand-in comes this long before the oGCD woven after it, and only where
// it fits: this far from the GCDs either side of it, at least.
const STAND_IN_LEAD_MS = 700;
const MIN_GCD_MS = 2_000;

// The plan's entries with a GCD before every oGCD: an oGCD is always woven
// after a GCD, so where the plan has none within a GCD's length before one,
// a stand-in comes just before it (`standIn`): the player's usual damage GCD
// (`filler`), else a plain "GCD". Only where one fits between the GCDs
// around it; where none does, the oGCD is a late weave after the GCD before.
// Not in the countdown, where oGCDs come before any GCD.
export function withStandInGcds(entries: PlanEntry[], filler: CatalogAction | undefined): PlanEntry[] {
  const sorted = [...entries].sort((a, b) => a.at - b.at);
  const gcds = sorted.filter(isGcd).map((e) => e.at);
  const added: PlanUseEntry[] = [];
  for (const entry of sorted) {
    if (entry.kind !== 'use' || isGcd(entry) || entry.at < 0) continue;
    if (gcds.some((at) => at <= entry.at && entry.at - at <= GCD_REACH_MS)) continue;
    const at = Math.max(0, entry.at - STAND_IN_LEAD_MS);
    if (gcds.some((g) => Math.abs(g - at) < MIN_GCD_MS)) continue;
    gcds.push(at);
    added.push({
      kind: 'use',
      at,
      action: filler?.name ?? 'GCD',
      icon: filler?.icon ?? null,
      description: filler?.description ?? null,
      target: null,
      covers: [],
      damage: false,
      overcap: false,
      gcd: true,
      standIn: true,
    });
  }
  return [...sorted, ...added].sort((a, b) => a.at - b.at);
}

export const isGcd = (entry: PlanEntry) => entry.kind === 'use' && !!entry.gcd;
