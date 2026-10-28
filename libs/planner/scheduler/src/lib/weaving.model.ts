// A GCD a player used, or will in the plan: when it starts and how long
// its cast bar runs (0 for an instant one).
export interface GcdCast {
  at: number;
  castMs: number;
  // Only where it landed: its cast bar began before (in the countdown), so
  // the next GCD comes sooner than one GCD after `at`. The plan can't put a
  // GCD of its own there.
  landed?: boolean;
  // Its spell's own cast time, and whether it was in a Lightspeed as played.
  fullMs?: number;
  lightspeed?: boolean;
  // Instant by a buff (Swiftcast, Lightspeed...) though it has a cast time:
  // a GCD the plan puts there is instant too.
  instant?: boolean;
}

// An action the plan already has a player use: an oGCD takes a weave slot,
// a GCD one of their GCDs (and its cast bar what follows it).
export interface Occupied {
  at: number;
  gcd: boolean;
  castMs: number;
}
