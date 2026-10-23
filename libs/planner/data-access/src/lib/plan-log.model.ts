// A hit as the plan leaves it.
export interface PlanHitEntry {
  kind: 'hit';
  at: number;
  action: string;
  unmitigated: number;
  planned: number;
  asPlayed: number;
  // What the plan's shields absorb of it.
  absorbed: number;
  // The planned damage, and their HP before and after it with the plan's
  // heals, as shares of their max HP.
  share: number | null;
  before: number | null;
  after: number | null;
  safe: boolean;
  // A failed mechanic, which the plan takes as avoided.
  avoidable: boolean;
  covers: string[];
}

// A mitigation, shield or heal the plan has the player use.
export interface PlanUseEntry {
  kind: 'use';
  at: number;
  action: string;
  // The party member it goes on, when it goes on one.
  target: string | null;
  // The mechanics it covers.
  covers: string[];
  // A damage action for no hit (Afflatus Misery).
  damage: boolean;
}

export type PlanEntry = PlanHitEntry | PlanUseEntry;
