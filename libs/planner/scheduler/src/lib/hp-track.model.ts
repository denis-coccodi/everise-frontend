// A change to one player's HP: damage taken (negative) or healing.
export interface HpEvent {
  at: number;
  player: number;
  amount: number;
}

// A player's HP once everything up to `at` (inclusive) has happened, and
// where the events after it start.
export interface HpCheckpoint {
  player: number;
  at: number;
  hp: number;
  next: number;
}
