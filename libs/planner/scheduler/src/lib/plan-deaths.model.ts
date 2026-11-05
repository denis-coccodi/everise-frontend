// A player the plan lets die, to a mechanic's hit, and who raises them,
// when it lands, and when they're back (at 20% HP); nulls for nobody able.
export interface PlannedDeath {
  player: number;
  at: number;
  mechanic: number;
  raisedBy: number | null;
  raisedAt: number | null;
  backAt: number | null;
}
