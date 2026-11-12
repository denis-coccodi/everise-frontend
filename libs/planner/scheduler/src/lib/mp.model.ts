import type { TimelineCast } from '@everise/core/api-types';

// A replanned player's MP with the plan: what it is after each change.
export interface PlannedMp {
  player: number;
  points: { at: number; mp: number }[];
  // A Dark Knight's Edges of Shadow as played that the plan drops for MP.
  dropped: number[];
  // The Edges of Shadow more than played their MP pays for with the plan
  // (Dark Arts, MP it saves), each at the earliest moment it fits.
  gained: number[];
}

// What the MP model counts besides the log's MP (`mpExtras`):
// - `fixed`: the plan's own uses that give MP, known before it plans (an
//   astrologian's draws): counted throughout, the plan's uses of those
//   actions then left out;
// - past a completed wipe's wipe point (`from`), where the players' MP is
//   made up (`mpPastWipePoint`): the casts it doesn't have (`unlogged`:
//   upkeep Lucid Dreaming and draws), counted once even where the plan's
//   uses have them too, and dropped where the plan schedules its own; and
//   what each player's damage spells cost a GCD (`perGcd`, by id), which a
//   GCD the plan puts there doesn't spend.
export interface MpExtras {
  from: number;
  fixed: TimelineCast[];
  unlogged: TimelineCast[];
  perGcd: Map<number, number>;
}

// A heal the plan wanted where the player hadn't the MP for it.
export interface MpShort {
  player: number;
  at: number;
}

// What a use is for, as the MP it may cost goes (`MpModel.affordable`): one
// a hit needs, spare margin, or a tank's upkeep on the autos.
export type MpUse = 'need' | 'spare' | 'upkeep';
