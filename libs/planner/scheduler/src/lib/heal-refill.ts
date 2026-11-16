import type { PullTimeline } from '@everise/core/api-types';
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
// An Aetherflow stack (Lustrate, Indomitability...) costs the Energy Drain
// it would have been, so it refills only before heavy ones, as a GCD does.
// A DPS's Second Wind (`self`) never refills: it's for their emergencies.
export function refillsBefore(heavy: Set<number>, everywhere = false) {
  return (id: number, tool: HealTool) =>
    tool.cost !== 'self' &&
    (everywhere ||
      heavy.has(id) ||
      (tool.cost !== 'gcd' && tool.cost !== 'fallback' && tool.pool?.name !== 'Aetherflow'));
}

// Past this many players missing HP, healers top the party up with heals on
// everyone, not one member at a time.
const SINGLE_AT_MOST = 2;

// What a refill (`short`, by player) leaves a heal on one member to make up:
// all of it while only a few are missing HP, else only the tanks'. In 54
// kills' logs healers topped up the DPS with party heals and kept their heals
// on one member for the tanks (Essential Dignity 54 times on a DPS to 173 on
// a tank; Tetragrammaton 29 to 131). The party heals take over as they count
// the hits after (`PARTY_AHEAD_WORTH` in heal-candidates.ts).
export function refillTargets(short: Map<number, number>, tool: HealTool, timeline: PullTimeline) {
  const missing = [...short].filter(([, d]) => d > 0);
  if (missing.length <= SINGLE_AT_MOST || !tool.effects.some((e) => e.target === 'target')) return short;
  const tanks = new Set(timeline.players.filter((p) => p.role === 'tank').map((p) => p.id));
  return new Map([...short].filter(([p]) => tanks.has(p)));
}
