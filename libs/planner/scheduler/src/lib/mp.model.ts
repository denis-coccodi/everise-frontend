import type { TimelineCast } from '@everise/core/api-types';

// A replanned player's MP with the plan: what it is after each change.
export interface PlannedMp {
  player: number;
  points: { at: number; mp: number }[];
  // A Dark Knight's Edges of Shadow as played that the plan drops for MP.
  dropped: number[];
}

// Past a completed wipe's wipe point (`from`), where the players' MP is
// made up (`mpPastWipePoint`): the casts it doesn't have (`unlogged`:
// Lucid Dreaming, Aetherflow, draws), counted once even where the plan's
// uses have them too, and dropped where the plan schedules its own; and
// what each player's damage spells cost a GCD (`perGcd`, by id), which a
// GCD the plan puts there doesn't spend.
export interface PastWipePoint {
  from: number;
  unlogged: TimelineCast[];
  perGcd: Map<number, number>;
}

// A heal the plan wanted where the player hadn't the MP for it.
export interface MpShort {
  player: number;
  at: number;
}
