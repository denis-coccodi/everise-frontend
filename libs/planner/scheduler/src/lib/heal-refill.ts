import type { MpModel } from './mp';
import type { HealTool } from './plan.model';
import type { Spent } from './heal-plan.model';

// Below this share of their max MP, a healer casts no GCD heal just to refill.
export const RESERVE = 0.3;

// What a GCD heal refilling the players is worth for its healer's MP then
// (`share` of their max): the healer with MP to spare casts it rather than
// one running low, and none below the reserve, which the hits' needs keep.
export function refillWorth(share: number): number {
  return share < RESERVE ? 0 : share;
}

// Each healer's MP with their uses so far (`own`), as shares of their max:
// worked out again only once they have another use.
export function mpShares(mp?: MpModel) {
  const known = new Map<number, { uses: number; at: (at: number) => number }>();
  return (player: number, own: Spent[]) => {
    if (!mp) return () => 1;
    const had = known.get(player);
    if (had?.uses === own.length) return had.at;
    const at = mp.shares(player, own);
    known.set(player, { uses: own.length, at });
    return at;
  };
}

// Whether a heal may refill everyone to full before mechanic `id`: any
// before a heavy one (`heavyMechanics`), else only what costs no damage
// (oGCDs, the Afflatus heals, Pneuma); any at all with `everywhere`.
export function refillsBefore(heavy: Set<number>, everywhere = false) {
  return (id: number, tool: HealTool) =>
    everywhere || heavy.has(id) || (tool.cost !== 'gcd' && tool.cost !== 'fallback');
}
