import type { PullTimeline } from '@everise/core/api-types';
import type { PlanOptions, PlannedUse } from './plan.model';
import { playedUses } from './played-uses';
import type { ReferencedTimeline } from './reference-damage.model';

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
// kept where it was, as a user's added skill is.
export function earlyUses(
  timeline: PullTimeline,
  tools: Parameters<typeof playedUses>[1],
  late: Map<number, number>,
): PlannedUse[] {
  return playedUses(
    timeline,
    tools.filter((t) => late.has(t.player)),
  )
    .filter((u) => u.at <= (late.get(u.player) ?? -Infinity))
    .map((u) => ({ ...u, played: true }));
}
