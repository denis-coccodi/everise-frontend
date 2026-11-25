import { PullTimeline } from '@everise/core/api-types';
import type { ToolPool } from './plan.model';
import type { ReferencedTimeline } from './reference-damage.model';

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
export const STACK_SPENDS = new Set([167, 189, 3583, 7434, 188]);
// Recitation makes the next of these spend none.
export const RECITATION = 16542;
export const RECITED = new Set([185, 37013, 3583, 7434]);
// The Faerie Gauge a stack spent gives, of the 50 a Fey Union takes.
const STACKS_A_UNION = 5;
// Past a completed wipe's wipe point, where nobody played, their stacks
// (3 a minute) all go within the minute: a Fey Union's worth every 100
// seconds.
const UNION_EVERY_MS = 100_000;

// When a scholar's Faerie Gauge, empty at the pull, has another Fey
// Union's worth: each fifth stack they spent, as played, and past a
// completed wipe's wipe point every 100 seconds.
export function faerieGaugeOf(timeline: ReferencedTimeline, scholar: number): number[] {
  const earned = unionsFrom(timeline.playerCasts.filter((c) => c.source === scholar));
  const { completion } = timeline;
  if (completion)
    for (let at = completion.from + UNION_EVERY_MS; at <= timeline.durationMs; at += UNION_EVERY_MS) earned.push(at);
  return earned;
}

// When each Fey Union's worth of Faerie Gauge is in: each fifth stack spent of `casts` (a scholar's), but one
// Recitation made free.
function unionsFrom(casts: { action: number; at: number }[]) {
  const spent: number[] = [];
  let recited = false;
  for (const cast of [...casts].sort((a, b) => a.at - b.at)) {
    if (cast.action === RECITATION) recited = true;
    else if (recited && RECITED.has(cast.action)) recited = false;
    else if (STACK_SPENDS.has(cast.action)) spent.push(cast.at);
  }
  return spent.filter((_, i) => (i + 1) % STACKS_A_UNION === 0);
}

// A scholar's Faerie Gauge as both their stacks as played (`pool.earned`) and the plan's own (`spent`, theirs: its
// Aetherflow heals) have filled it, each Fey Union's worth when both have: the plan's check fills it from the plan's
// column, so an Aetherpact on the stacks they spent as played, where the plan spent fewer, was one they couldn't press.
export function withPlannedGauge(pool: ToolPool, spent: { action: number; at: number }[]): ToolPool {
  const planned = unionsFrom(spent);
  const played = [...(pool.earned ?? [])].sort((a, b) => a - b);
  return { ...pool, earned: played.slice(0, planned.length).map((t, i) => Math.max(t, planned[i])) };
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

// Sacred Soil, and the Aetherflow heals it goes before (Indomitability, Lustrate).
const SACRED_SOIL = 188;
const AFTER_SOIL = new Set([3583, 189]);

// The best of `candidates` (`better`), but a scholar's Sacred Soil where it's one of them and the best is their
// Indomitability or Lustrate: Soil first, the others only where it can't help (The Balance, 7.4: Sacred Soil "instead of
// Lustrate or Indomitability if the party will remain inside the bubble"; Lustrate "only if Excogitation and Sacred
// Soil cannot be used"). One Recitation makes critical stays, for burst healing. On 16 bench kills, the logs' scholars
// pressed Indomitability with Soil back 29% of the time, the plan 57%.
export function soilFirst<C extends { use: { player: number; action: number; critical?: boolean } }>(
  candidates: (C | null)[],
  better: (a: C, b: C) => boolean,
): C | null {
  const best = candidates.reduce<C | null>((a, c) => (c && (!a || better(c, a)) ? c : a), null);
  if (!best || !AFTER_SOIL.has(best.use.action) || best.use.critical) return best;
  return candidates.find((c) => c?.use.action === SACRED_SOIL && c.use.player === best.use.player) ?? best;
}
