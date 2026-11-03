import type { ReferencedTimeline } from '@everise/planner/scheduler';

// Whether a pull's plan can cover the whole fight (`wipeCompletion`): a
// kill; a wipe whose other groups' kills are being read, of which none
// could be read, none lines up with, that lasted under half their usual
// length, or that no kill adds anything to (it outlasted them); or a wipe
// offered completed (`timeline`). Times in ms.
export type WipeCompletion =
  | { state: 'kill' | 'reading' | 'none' | 'unaligned' }
  | { state: 'short' | 'nothing-left'; lasted: number; usual: number }
  | { state: 'offered'; lasted: number; usual: number; timeline: ReferencedTimeline };
