// Where a wipe and another group's kill of the fight line up: the latest
// boss cast (`name`) both logs share in order, at `wipeAt` in the wipe and
// `clearAt` in the kill. The kill's rest of the fight, shifted by `offset`
// (wipeAt - clearAt), continues the wipe, and ends at `endsAt`.
export interface Alignment {
  // Which of the kills read, by its place among them.
  clear: number;
  name: string;
  wipeAt: number;
  clearAt: number;
  offset: number;
  endsAt: number;
  // How many boss casts the two share in order, up to the anchor.
  matched: number;
}

// Another group's kill's players by id, each to this group's player in
// their place (`player`), and whether that one plays the same job.
export type StandIns = Record<number, { player: number; sameJob: boolean }>;
