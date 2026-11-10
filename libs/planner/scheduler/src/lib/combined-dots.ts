import type { PullTimeline } from '@everise/core/api-types';

// FFLogs logs a damage-over-time tick twice when it merges ticks: once by
// its status ("Bleeding") and once as a tick of this name, for the same
// amount at the same moment. Over the benchmark's 36 ultimate kills, about
// two in three of these ticks repeat ticks already logged; the rest are
// the only record of their damage.
export const COMBINED_DOTS = 'Combined DoTs';

// Ticks this close together on one target are the same moment.
const SAME_MS = 50;
// Damage is rounded per tick, so a sum may be off by a point or two.
const ROUNDING = 2;

// The pull without the "Combined DoTs" ticks that repeat others: those
// whose amount the target's other ticks at the same moment add up to.
// Counted twice, a bleed took the plan's HP to 0 where the log shows
// nothing of the kind (Futures Rewritten's Burnished Glory).
export function withoutRepeatedDots(timeline: PullTimeline): PullTimeline {
  const combined = new Set(timeline.actions.filter((a) => a.name === COMBINED_DOTS).map((a) => a.id));
  if (!combined.size) return timeline;
  const ticks = timeline.damage.filter((h) => h.tick && !combined.has(h.action));
  const repeats = (hit: PullTimeline['damage'][number]) => {
    const same = ticks.filter((t) => t.target === hit.target && Math.abs(t.at - hit.at) <= SAME_MS);
    return same.length > 0 && Math.abs(same.reduce((sum, t) => sum + t.amount, 0) - hit.amount) <= ROUNDING;
  };
  const damage = timeline.damage.filter((hit) => !combined.has(hit.action) || !repeats(hit));
  return damage.length === timeline.damage.length ? timeline : { ...timeline, damage };
}
