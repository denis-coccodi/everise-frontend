import type { ActionCatalog, PullTimeline } from '@everise/core/api-types';

// The Blackest Night: once its shield breaks, Dark Arts makes the Dark
// Knight's next Edge or Flood of Shadow free, which gives back what The
// Blackest Night cost. One that breaks costs no MP in the end; one that
// doesn't costs an Edge.
export const BLACKEST_NIGHT = 7393;

// When a Blackest Night cast on `target` at `at` breaks, or null when it
// doesn't. It breaks once its target has taken a shield's worth (a share of
// their max HP) in its time, counted as played, mitigation and other
// shields included, auto-attacks and damage over time too.
export function blackestNightBreaks(timeline: PullTimeline, catalog: ActionCatalog) {
  const shield = catalog.actions
    .find((a) => a.id === BLACKEST_NIGHT)
    ?.effects.find((e) => e.kind === 'shield' && e.of === 'maxHp');
  const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp]));
  const taken = new Map<number, { at: number; amount: number }[]>();
  for (const hit of timeline.damage) {
    const list = taken.get(hit.target) ?? [];
    list.push({ at: hit.at, amount: hit.amount + hit.absorbed });
    taken.set(hit.target, list);
  }
  for (const list of taken.values()) list.sort((a, b) => a.at - b.at);
  return (target: number, at: number): number | null => {
    const max = maxHp.get(target);
    if (!shield?.percent || !max) return null;
    const needed = (shield.percent / 100) * max;
    let sum = 0;
    for (const hit of taken.get(target) ?? []) {
      if (hit.at <= at) continue;
      if (hit.at > at + (shield.durationMs ?? 0)) break;
      sum += hit.amount;
      if (sum >= needed) return hit.at;
    }
    return null;
  };
}
