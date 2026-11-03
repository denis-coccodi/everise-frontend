import type { ActionCatalog } from '@everise/core/api-types';
import {
  alignment,
  completedTimeline,
  MIN_PROGRESS,
  progress,
  wipePoint,
  type ReferencedTimeline,
} from '@everise/planner/scheduler';
import type { WipeCompletion } from './plan-completion.model';

// What planning a pull's whole fight can do with it: a kill has nothing to
// complete; a wipe waits for other groups' kills to be read, then is
// offered completed from the one that lines up with it (shares enough of
// the boss's casts in order), when it got through at least half of that
// kill's mechanics and not all of them; else only what was logged is
// planned, and why is said.
export function wipeCompletion(timeline: ReferencedTimeline, wiped: boolean, catalog: ActionCatalog): WipeCompletion {
  if (!wiped) return { state: 'kill' };
  const { clears } = timeline;
  if (!clears) return { state: 'reading' };
  if (!clears.length) return { state: 'none' };
  const aligned = alignment(timeline, clears);
  if (!aligned) return { state: 'unaligned' };
  const clear = clears[aligned.clear];
  const got = progress(clear, aligned, wipePoint(timeline));
  if (got.reached < MIN_PROGRESS * got.total) return { state: 'short', ...got };
  const completed = got.reached < got.total ? completedTimeline(timeline, clear, aligned, catalog) : null;
  if (!completed) return { state: 'nothing-left', ...got };
  return { state: 'offered', ...got, timeline: completed };
}
