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
// Nor does a heal on one member before a light one: healers keep those
// cooldowns for the hits that need them, and leave the rest to their party
// heals (see `refillTargets`). Nor Lustrate, but with `everywhere`: scholars
// keep its stack for Energy Drain unless a hit needs it (in 54 kills' logs,
// 23 on a tank to the plan's 113).
const LUSTRATE = 189;
export function refillsBefore(heavy: Set<number>, everywhere = false) {
  return (id: number, tool: HealTool) =>
    tool.cost !== 'self' &&
    (everywhere ||
      (tool.action !== LUSTRATE &&
        (heavy.has(id) ||
          (tool.cost !== 'gcd' && tool.cost !== 'fallback' && tool.pool?.name !== 'Aetherflow' && !onOne(tool)))));
}

// A heal on one member (Essential Dignity, Tetragrammaton, Druochole...).
const onOne = (tool: HealTool) => tool.effects.some((e) => e.target === 'target');

// Past this many players missing HP, healers top the party up with heals on
// everyone, not one member at a time.
const SINGLE_AT_MOST = 2;
// What someone not a tank must be missing, of their max HP, for a heal on
// them alone.
const SINGLE_MISSING = 0.2;

// What a refill (`short`, by player) leaves a heal on one member to make up.
// A tank's missing HP; anyone else's only from a fifth of their max HP; and
// once more than `SINGLE_AT_MOST` of those are left, only the tanks'. In 54
// kills' logs, two thirds of the heals on one DPS went in with them missing
// 30% or more, 22 of 177 under 10%: healers top up the rest with party heals,
// which take over as they count the hits after (`PARTY_AHEAD_WORTH` in
// heal-candidates.ts). Refilling to full, the plan had put 416 of its 738 on
// a DPS missing under 10%.
export function refillTargets(short: Map<number, number>, tool: HealTool, timeline: PullTimeline) {
  if (!onOne(tool)) return short;
  const player = (id: number) => timeline.players.find((p) => p.id === id);
  const worth = (id: number, missing: number) =>
    player(id)?.role === 'tank' || missing >= SINGLE_MISSING * (player(id)?.maxHp ?? Infinity);
  const left = new Map([...short].filter(([id, missing]) => worth(id, missing)));
  if ([...left.values()].filter((d) => d > 0).length <= SINGLE_AT_MOST) return left;
  return new Map([...left].filter(([id]) => player(id)?.role === 'tank'));
}
