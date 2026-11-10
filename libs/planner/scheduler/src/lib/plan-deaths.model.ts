// A player the plan lets die, to a mechanic's hit or to whatever else
// took their last HP (a damage-over-time tick, an auto-attack: `cause`),
// and who raises them, when it lands, and when they're back (at 20% HP);
// nulls for nobody able.
export interface PlannedDeath {
  player: number;
  at: number;
  // The mechanic whose hit killed them; null for damage outside the mechanics.
  mechanic: number | null;
  // What took their last HP when no mechanic did: the damage's name.
  cause?: string;
  raisedBy: number | null;
  raisedAt: number | null;
  backAt: number | null;
}
