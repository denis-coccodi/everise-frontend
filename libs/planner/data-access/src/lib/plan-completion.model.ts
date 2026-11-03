import type { Progress, ReferencedTimeline } from '@everise/planner/scheduler';

// Whether a pull's plan can cover the whole fight (`wipeCompletion`): a
// kill; a wipe whose other groups' kills are being read, of which none
// could be read, or none lines up with; one that got through under half
// the fight's mechanics, or all of them (nothing is left to add); or a
// wipe offered completed (`timeline`). With how far it got (`Progress`).
export type WipeCompletion =
  | { state: 'kill' | 'reading' | 'none' | 'unaligned' }
  | ({ state: 'short' | 'nothing-left' } & Progress)
  | ({ state: 'offered'; timeline: ReferencedTimeline } & Progress);
