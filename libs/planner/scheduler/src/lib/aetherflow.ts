import { PullTimeline } from '@everise/core/api-types';
import type { ToolPool } from './plan.model';

// A scholar's Aetherflow stacks, as the game has them: none at the pull,
// 3 from each Aetherflow (every 60s) and each Dissipation (every 180s, the
// fairy away for 30s), never more than 3, one for each Lustrate,
// Indomitability, Excogitation and Sacred Soil the plan uses. The plan
// spends them on heals where they're needed; what's left goes to Energy
// Drain, as the scholar likes.
export const AETHERFLOW = 166;
export const DISSIPATION = 3587;

// When each of a scholar's stacks come back, as played.
export function refillsOf(timeline: PullTimeline, scholar: number): number[] {
  return timeline.playerCasts
    .filter((c) => c.source === scholar && (c.action === AETHERFLOW || c.action === DISSIPATION))
    .map((c) => c.at)
    .sort((a, b) => a - b);
}

// What spends a stack: Energy Drain, Lustrate, Indomitability,
// Excogitation and Sacred Soil.
const SPENDS = new Set([167, 189, 3583, 7434, 188]);
// Recitation makes the next of these spend none.
const RECITATION = 16542;
const RECITED = new Set([185, 37013, 3583, 7434]);
// The Faerie Gauge a stack spent gives, of the 50 a Fey Union takes.
const STACKS_A_UNION = 5;

// When a scholar's Faerie Gauge, empty at the pull, has another Fey
// Union's worth: each fifth stack they spent, as played.
export function faerieGaugeOf(timeline: PullTimeline, scholar: number): number[] {
  const casts = timeline.playerCasts.filter((c) => c.source === scholar).sort((a, b) => a.at - b.at);
  const spent: number[] = [];
  let recited = false;
  for (const cast of casts) {
    if (cast.action === RECITATION) recited = true;
    else if (recited && RECITED.has(cast.action)) recited = false;
    else if (SPENDS.has(cast.action)) spent.push(cast.at);
  }
  return spent.filter((_, i) => (i + 1) % STACKS_A_UNION === 0);
}

// The tools with their player's Aetherflow stacks as the pull refills
// them (or as `refills` has them, by player: an opener's), in place of a
// pool that refills on its own; and their Faerie Gauge as the stacks they
// spent fill it.
export function withAetherflow<T extends { player: number; pool: ToolPool | null }>(
  timeline: PullTimeline,
  tools: T[],
  refills = new Map<number, number[]>(),
): T[] {
  return tools.map((t) => {
    if (t.pool?.name === 'Aetherflow')
      return {
        ...t,
        pool: { ...t.pool, gainMs: 60_000, refills: refills.get(t.player) ?? refillsOf(timeline, t.player) },
      };
    if (t.pool?.name === 'Faerie Gauge')
      return { ...t, pool: { ...t.pool, earned: faerieGaugeOf(timeline, t.player) } };
    return t;
  });
}
