import type { Progress, ReferencedTimeline } from '@everise/planner/scheduler';

// Whether a pull's plan can cover the whole fight (`wipeCompletion`): a
// kill; a wipe whose other groups' kills are being read, of which none
// could be read (nor any pull of the report that got further), or none
// lines up with; one that got through all of the fight's mechanics
// (nothing is left to add); or a wipe offered completed
// (`timeline`). With how far it got (`Progress`), against other groups'
// kills or the report's own further pulls (`source`).
export type WipeCompletion =
  | { state: 'kill' | 'reading' | 'none' | 'unaligned' }
  | ({ state: 'nothing-left'; source: CompletionSource } & Progress)
  | ({ state: 'offered'; source: CompletionSource; timeline: ReferencedTimeline } & Progress);

export type CompletionSource = NonNullable<ReferencedTimeline['clearsFrom']>;
