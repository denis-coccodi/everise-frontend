// A replanned player's MP with the plan: what it is after each change.
export interface PlannedMp {
  player: number;
  points: { at: number; mp: number }[];
}

// A heal the plan wanted where the player hadn't the MP for it.
export interface MpShort {
  player: number;
  at: number;
}
