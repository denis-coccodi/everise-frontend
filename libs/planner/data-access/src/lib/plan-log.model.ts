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
  // A failed mechanic (`failed`), and whether the plan takes it as avoided.
  failed?: boolean;
  avoidable: boolean;
  covers: string[];
}

// A mitigation, shield or heal the plan has the player use.
export interface PlanUseEntry {
  kind: 'use';
  at: number;
  action: string;
  // Its icon (the game's id) and tooltip, when the catalog has them.
  icon?: number | null;
  description?: string | null;
  // The party member it goes on, when it goes on one.
  target: string | null;
  // What to press first (Eukrasia), when it needs it.
  first?: string | null;
  // The mechanics it covers.
  covers: string[];
  // A damage action for no hit (Afflatus Misery).
  damage: boolean;
  // A lily spent because the lilies are full.
  overcap: boolean;
  // A step of the player's opener.
  opener?: boolean;
  // A raid buff or burst on cooldown, or an astrologian's draw and card.
  burst?: boolean;
  // A resource for the heals after (Rhizomata).
  refill?: boolean;
  // A second press: Kardia put back, or Horoscope read again.
  again?: 'kardia' | 'horoscope';
  // Kept as the player used it (a buff, an enabler), and what it does.
  kept?: string;
  // A GCD (a heal spell, Afflatus Misery): it comes first in its row.
  gcd?: boolean;
}

// One of the player's GCDs as played, which a planned oGCD is woven after:
// a damage GCD, the plan placing only heals and mitigations (it stands in
// for whichever they cast there). Their first, when they began casting it in
// the countdown, shows either way.
export interface PlanGcdEntry {
  kind: 'gcd';
  at: number;
  // Cast in the countdown: `at` is when it lands, `castAt` when its cast
  // began (null when that isn't known).
  prepull: boolean;
  castAt: number | null;
}

export type PlanEntry = PlanHitEntry | PlanUseEntry | PlanGcdEntry;
