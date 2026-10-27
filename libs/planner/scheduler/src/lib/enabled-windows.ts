import { PullTimeline } from '@everise/core/api-types';

// Heals a DPS can only use under a status their burst grants, by action:
// Lux Solaris under Refulgent Lux (30s from Summon Solar Bahamut). Their
// burst stays as played, so the windows come from the statuses in the
// pull, each its full length from when it was granted (the pull's ends
// when it's spent).
const ONLY_UNDER: Record<number, { status: number; ms: number }> = {
  36997: { status: 3874, ms: 30_000 }, // Lux Solaris
};

// The tools with the time outside those windows away.
export function withEnablerWindows<T extends { player: number; action: number; away?: { from: number; to: number }[] }>(
  timeline: PullTimeline,
  tools: T[],
): T[] {
  return tools.map((t) => {
    const only = ONLY_UNDER[t.action];
    if (!only) return t;
    const windows = timeline.auras
      .filter((a) => a.status === only.status && a.target === t.player)
      .map((a) => ({ from: a.from, to: a.from + only.ms }))
      .sort((a, b) => a.from - b.from);
    const away: { from: number; to: number }[] = [];
    let from = -Infinity;
    for (const w of windows) {
      if (w.from > from) away.push({ from, to: w.from });
      from = Math.max(from, w.to);
    }
    away.push({ from, to: Infinity });
    return { ...t, away: [...(t.away ?? []), ...away] };
  });
}
