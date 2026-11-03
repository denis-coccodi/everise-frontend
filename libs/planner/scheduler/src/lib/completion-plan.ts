import type { PullTimeline } from '@everise/core/api-types';
import type { PlanOptions, PlannedUse } from './plan.model';
import { playedUses } from './played-uses';
import type { ReferencedTimeline } from './reference-damage.model';
import { MISERY } from './spare-heals';

// The players a completed wipe has planned from its wipe point on, by id,
// that moment: those with no stand-in of their job in the kill, who did
// nothing there, unless asked to be replanned from the pull's start.
// Everyone replanned (no `replan`): none.
export function lateStarts(timeline: ReferencedTimeline, asked: PlanOptions): Map<number, number> {
  const { completion } = timeline;
  const replan = asked.replan;
  if (!completion || !replan) return new Map();
  return new Map(completion.plannedFrom.filter((p) => !replan.includes(p)).map((p) => [p, completion.from]));
}

// Where each player's GCDs as played stop in a completed wipe, by id: at
// its wipe point for those with no stand-in of their job in the kill, who
// did nothing there, replanned from the pull's start or from there. Past
// it, their GCD heals need slots of their own (`Weaving`'s `freeFrom`).
export function castsStopAt(timeline: ReferencedTimeline): Map<number, number> {
  const { completion } = timeline;
  return new Map(completion?.plannedFrom.map((p) => [p, completion.from]) ?? []);
}

// The tools, a late-starting player's away until their start.
export function startingAt<T extends { player: number; away?: { from: number; to: number }[] }>(
  tools: T[],
  late: Map<number, number>,
): T[] {
  return tools.map((t) => {
    const from = late.get(t.player);
    return from === undefined ? t : { ...t, away: [...(t.away ?? []), { from: -Infinity, to: from }] };
  });
}

// What late-starting players used of `tools` before their start, as played:
// kept where it was, as a user's added skill is. A white mage's Afflatus
// Miseries too, so the Blood Lily blooms again only once three lilies
// have gone since their last.
export function earlyUses(
  timeline: PullTimeline,
  tools: Parameters<typeof playedUses>[1],
  late: Map<number, number>,
): PlannedUse[] {
  const before = (player: number, at: number) => at <= (late.get(player) ?? -Infinity);
  const miseries = timeline.playerCasts
    .map((c) => ({ ...c, at: c.at + (c.castMs ?? 0) }))
    .filter((c) => c.action === MISERY.action && before(c.source, c.at))
    .map((c) => ({ player: c.source, ...MISERY, at: c.at, target: null, covers: [], damage: true }));
  return [
    ...playedUses(
      timeline,
      tools.filter((t) => late.has(t.player)),
    ).filter((u) => before(u.player, u.at)),
    ...miseries,
  ].map((u) => ({ ...u, played: true }));
}
