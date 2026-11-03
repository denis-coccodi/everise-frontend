import type { ActionCatalog } from '@everise/core/api-types';
import {
  alignment,
  completedTimeline,
  coverage,
  MIN_COVERAGE,
  type ReferencedTimeline,
} from '@everise/planner/scheduler';
import type { WipeCompletion } from './plan-completion.model';

// What planning a pull's whole fight can do with it: a kill has nothing to
// complete; a wipe waits for other groups' kills to be read, then is
// offered completed from them when it lasted at least half their usual
// length and one lines up with it (shares enough of the boss's casts in
// order) and adds to it; else only what was logged is planned,
// and why is said. `lasted` is the log's length, `usual` the kills' median.
export function wipeCompletion(timeline: ReferencedTimeline, wiped: boolean, catalog: ActionCatalog): WipeCompletion {
  if (!wiped) return { state: 'kill' };
  const { clears } = timeline;
  if (!clears) return { state: 'reading' };
  const share = coverage(timeline, clears);
  if (share === null) return { state: 'none' };
  const lasted = timeline.durationMs;
  const usual = median(clears.map((c) => c.durationMs));
  if (share < MIN_COVERAGE) return { state: 'short', lasted, usual };
  const aligned = alignment(timeline, clears);
  if (!aligned) return { state: 'unaligned' };
  const completed = completedTimeline(timeline, clears[aligned.clear], aligned, catalog);
  if (!completed) return { state: 'nothing-left', lasted, usual };
  return { state: 'offered', lasted, usual, timeline: completed };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
