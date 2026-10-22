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
}

// A heal or mitigation the player used.
export interface UseEntry {
  kind: 'use';
  at: number;
  action: string;
  effects: string;
}

export interface DeathEntry {
  kind: 'death';
  at: number;
  action: string | null;
}

export type LogEntry = HitEntry | UseEntry | DeathEntry;
