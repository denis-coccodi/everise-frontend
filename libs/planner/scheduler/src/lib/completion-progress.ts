import type { PullTimeline } from '@everise/core/api-types';
import type { Alignment, Progress } from './completion.model';
import { mechanicsOf } from './mechanics';

// How far a wipe got through the fight, by mechanics rather than time
// (groups push phases at different times): of the mechanics of the kill
// it lines up with (`aligned`), those before its wipe point (`from`) once
// shifted onto its clock. The one that wiped it is still to come.
export function progress(clear: PullTimeline, aligned: Alignment, from: number): Progress {
  const mechanics = mechanicsOf(clear);
  return { reached: mechanics.filter((m) => m.at + aligned.offset <= from).length, total: mechanics.length };
}
