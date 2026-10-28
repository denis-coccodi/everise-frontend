import type { Severity } from '@everise/planner/scheduler';
// A hit a player took, and what covered it.
export interface HitEntry {
  kind: 'hit';
  at: number;
  action: string;
  source: string;
  // What they lost, and what it was before anything reduced it.
  amount: number;
  unmitigated: number | null;
  // The share mitigation took off (0.34: a third), and what shields took.
  mitigated: number | null;
  absorbed: number;
  overkill: number;
  // Their HP at the hit, and as a share of their max HP.
  hp: number | null;
  hpShare: number | null;
  // The mitigations and shields on them, and the enemy debuffs (Reprisal,
  // Addle...) on whoever hit them, when it landed.
  covers: string[];
  // How hard the attack hits (null: no boss mechanic, or no max HP).
  severity: Severity | null;
}

// A heal or mitigation the player used.
export interface UseEntry {
  kind: 'use';
  at: number;
  action: string;
  // Who it went on, for a single-target one.
  target: string | null;
  // Its icon (the game's id) and tooltip, when the catalog has them.
  icon?: number | null;
  description?: string | null;
  effects: string;
  // When its cast began, for one begun in the countdown.
  castAt?: number | null;
}

export interface DeathEntry {
  kind: 'death';
  at: number;
  action: string | null;
}

export type LogEntry = HitEntry | UseEntry | DeathEntry;
