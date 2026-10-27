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

// The tools with their player's Aetherflow stacks as the pull refills
// them, in place of a pool that refills on its own.
export function withAetherflow<T extends { player: number; pool: ToolPool | null }>(
  timeline: PullTimeline,
  tools: T[],
): T[] {
  return tools.map((t) =>
    t.pool?.name === 'Aetherflow'
      ? { ...t, pool: { ...t.pool, gainMs: 60_000, refills: refillsOf(timeline, t.player) } }
      : t,
  );
}
