// One cast in a player's column: the plan's own use of it, or one kept as they played (`asPlayed`), or the log's.
export interface LegalityCast {
  action: number;
  at: number;
  source: 'plan' | 'played' | 'log';
}

// What a cast lacked: its cooldown or a charge, the status that enables it, or what it spends.
export type LegalityRule =
  'recast' | 'enabler' | 'blood lily' | 'pool' | 'aetherflow' | 'gauge' | 'addersting' | 'level';

// What a cast lacked, before it's named for its player.
export interface Lacking {
  cast: LegalityCast;
  rule: LegalityRule;
  needs: string;
}

// A cast its player couldn't have pressed.
export interface ImpossibleCast extends LegalityCast {
  player: number;
  rule: LegalityRule;
  // What it needed, for the reader: "Impact Imminent", "Addersgall", "Plenary Indulgence's recast".
  needs: string;
}

// The plan's impossible casts, and the log's under the same rules: those are the rules' blind spots or the log's
// noise (a cast it misses), not the plan's.
export interface PlanLegality {
  plan: ImpossibleCast[];
  log: ImpossibleCast[];
}
