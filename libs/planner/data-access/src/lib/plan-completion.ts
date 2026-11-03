import type { ActionCatalog } from '@everise/core/api-types';
import { alignment, completedTimeline, progress, wipePoint, type ReferencedTimeline } from '@everise/planner/scheduler';
import type { WipeCompletion } from './plan-completion.model';

// What planning a pull's whole fight can do with it: a kill has nothing to
// complete; a wipe waits for other groups' kills to be read, then is
// offered completed from the one that lines up with it (shares enough of
// the boss's casts in order and in time), when it didn't get through all
// of that kill's mechanics (the report's own further pulls stand in for
// kills when FFLogs has none); else only what was logged is planned, and
// why is said. However far the wipe got: on real kills cut from 10% to 90%
// of the way, the rest completed from another kill was as right (about 9
// mechanics in 10 at their time), once lined up.
export function wipeCompletion(timeline: ReferencedTimeline, wiped: boolean, catalog: ActionCatalog): WipeCompletion {
  if (!wiped) return { state: 'kill' };
  const { clears } = timeline;
  if (!clears) return { state: 'reading' };
  if (!clears.length) return { state: 'none' };
  const aligned = alignment(timeline, clears);
  if (!aligned) return { state: 'unaligned' };
  const clear = clears[aligned.clear];
  const got = progress(clear, aligned, wipePoint(timeline));
  const source = timeline.clearsFrom ?? 'kills';
  const completed = got.reached < got.total ? completedTimeline(timeline, clear, aligned, catalog) : null;
  if (!completed) return { state: 'nothing-left', source, ...got };
  return { state: 'offered', source, ...got, timeline: completed };
}
