import type { PlannedUse } from './plan.model';

// An opener a replanned player can start the pull with (see OPENERS):
// "none" has no opener, the plan placing what it needs.
export type OpenerId = 'standard' | 'dissipation-first' | 'double-misery' | 'pneuma' | 'none';

// A step of an opener: an oGCD woven after the player's GCD `afterGcd`
// (counted from 0, the spell begun in the countdown), that GCD itself
// (`gcd`), or a moment of the countdown (`at`, before the pull: negative).
// `name` for an action the catalog doesn't have (a card played).
export interface OpenerStep {
  action: number;
  name?: string;
  afterGcd?: number;
  gcd?: number;
  at?: number;
}

export interface OpenerPreset {
  id: OpenerId;
  name: string;
  // Where it comes from, for the page to say.
  source: string;
  steps: OpenerStep[];
}

// What the replanned players' openers (the standard one unless `chosen`
// says otherwise) change in the plan: each scholar's Aetherflow refills
// and Dissipations, each astrologian's draws, and the openers' steps.
export interface Opening {
  refills: Map<number, number[]>;
  dissipations: Map<number, number[]>;
  draws: Map<number, { astral: number[]; umbral: number[] }>;
  uses: PlannedUse[];
}
