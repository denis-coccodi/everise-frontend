import type { CatalogAction } from '@everise/core/api-types';

// Known GCDs this close to a cast make it an oGCD woven between them: GCDs
// come about 2.5 seconds apart.
const GCD_GAP_MS = 1_500;
// Never GCDs: Sprint, and items (potions) from this id up.
const SPRINT = 3;
const ITEMS_FROM = 1_000_000;

// Whether each of a player's casts (`casts`, all of theirs) is a GCD: as the
// catalog has it, or for an action it doesn't list (a combo's or a proc's:
// Sepulchre, Blade of Faith, Inner Chaos), one with no GCD it knows within
// 1.5 seconds either side; never Sprint or an item.
export function gcdCasts(casts: { at: number; action: number }[], byId: Map<number, CatalogAction>) {
  const known = casts.filter((c) => byId.get(c.action)?.gcd).map((c) => c.at);
  return (c: { at: number; action: number }) => {
    const action = byId.get(c.action);
    if (action) return action.gcd;
    if (c.action === SPRINT || c.action >= ITEMS_FROM) return false;
    return !known.some((at) => Math.abs(at - c.at) < GCD_GAP_MS);
  };
}
