import type { Invulnerability } from './plan.model';

// A change to one player's HP: damage taken (negative) or healing.
export interface HpEvent {
  at: number;
  player: number;
  amount: number;
  // The least HP it can leave (1 under Holmgang); 0 when not given.
  floor?: number;
}

// A player's HP once everything up to `at` (inclusive) has happened, and
// where the events after it start.
export interface HpCheckpoint {
  player: number;
  at: number;
  hp: number;
  next: number;
}

// When an invulnerability is up on a player, and which.
export interface Guard {
  player: number;
  from: number;
  to: number;
  invulnerable: Invulnerability;
}
