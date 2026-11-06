import type { PullTimeline } from '@everise/core/api-types';

// FFLogs logs the ticks of a caster's heals over time on one target that
// land together as a single tick of this name, not by status. Over top
// ultimate kills, a quarter of the healers' healing comes so.
export const COMBINED_HOTS = 'Combined HoTs';
// A status still counts this long after it ends, as the game snapshots it.
const SNAPSHOT_MS = 1_000;

type Heal = PullTimeline['heals'][number];

// For each "Combined HoTs" tick, the share of it that belongs to heals over
// time the plan doesn't replace (`planned`: by the caster and the status),
// which stays as played. A tick is split between the caster's heals over
// time that were on the target then, each weighted by its usual tick from
// that caster (the log's own ticks of it); where none was seen on them, by
// all the caster's healing over time. With no way to tell, all of it stays.
export function combinedShares(
  timeline: PullTimeline,
  planned: (source: number, status: number) => boolean,
): Map<Heal, number> {
  const shares = new Map<Heal, number>();
  const combined = new Set(timeline.actions.filter((a) => a.name === COMBINED_HOTS).map((a) => a.id));
  if (!combined.size) return shares;
  // Each caster's ticks by status: how much, and how many.
  const ticks = new Map<number, Map<number, { sum: number; n: number }>>();
  for (const h of timeline.heals) {
    if (h.source === null || h.status === null || !h.tick) continue;
    const own = ticks.get(h.source) ?? new Map<number, { sum: number; n: number }>();
    const t = own.get(h.status) ?? { sum: 0, n: 0 };
    own.set(h.status, { sum: t.sum + h.amount + h.overheal, n: t.n + 1 });
    ticks.set(h.source, own);
  }
  for (const h of timeline.heals) {
    if (h.source === null || h.action === null || !combined.has(h.action)) continue;
    const own = ticks.get(h.source);
    if (!own) continue;
    const on = new Set(
      timeline.auras
        .filter((a) => a.source === h.source && a.target === h.target && own.has(a.status))
        .filter((a) => a.from <= h.at && h.at <= a.to + SNAPSHOT_MS)
        .map((a) => a.status),
    );
    const weights = on.size
      ? [...on].map((s) => [s, (own.get(s)?.sum ?? 0) / (own.get(s)?.n || 1)] as const)
      : [...own].map(([s, t]) => [s, t.sum] as const);
    const total = weights.reduce((sum, [, w]) => sum + w, 0);
    if (!total) continue;
    const kept = weights.filter(([s]) => !planned(h.source as number, s)).reduce((sum, [, w]) => sum + w, 0);
    shares.set(h, kept / total);
  }
  return shares;
}
