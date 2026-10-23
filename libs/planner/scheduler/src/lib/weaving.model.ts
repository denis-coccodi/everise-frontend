// A GCD a player used, or will in the plan: when it starts and how long
// its cast bar runs (0 for an instant one).
export interface GcdCast {
  at: number;
  castMs: number;
}

// An action the plan already has a player use: an oGCD takes a weave slot,
// a GCD one of their GCDs (and its cast bar what follows it).
export interface Occupied {
  at: number;
  gcd: boolean;
  castMs: number;
}
