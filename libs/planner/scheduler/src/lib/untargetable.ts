import type { PullTimeline } from '@everise/core/api-types';

// When nothing could be targeted: the pull's downtime (FFLogs' targetability
// changes), but for a window where players cast at an enemy all the same (an
// add FFLogs has no change for: TEA's Living Liquid in the first 35s).
export function untargetable(timeline: PullTimeline): { from: number; to: number }[] {
  const party = new Set(timeline.players.map((p) => p.id));
  const atEnemy = timeline.playerCasts.filter((c) => c.target !== null && !party.has(c.target)).map((c) => c.at);
  return timeline.downtime.filter((d) => !atEnemy.some((at) => at > d.from && at < d.to));
}

// The tools with an effect on enemies (Reprisal, Feint, Addle, Dismantle)
// away while nothing can be targeted: they need an enemy to use them on.
export function withTargetsGone<T extends { effects: { target: string }[]; away?: { from: number; to: number }[] }>(
  timeline: PullTimeline,
  tools: T[],
): T[] {
  const gone = untargetable(timeline);
  if (!gone.length) return tools;
  return tools.map((t) =>
    t.effects.some((e) => e.target === 'enemies') ? { ...t, away: [...(t.away ?? []), ...gone] } : t,
  );
}
