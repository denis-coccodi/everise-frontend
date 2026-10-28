// A player in the plan's options: who they are in the report, and their id
// in the pull.
export interface PlanPlayer {
  id: number;
  name: string;
  server: string | null;
}

// What one of a tank's invulnerabilities is set to: a mechanic (its id),
// never, or the plan's to place.
export type InvulnerabilitySetting = number | 'never' | 'planner';

// What the plan does with a failed mechanic: covers it like any other hit,
// as far as anything saves the player, or takes it as avoided.
export type FailedMechanics = 'cover' | 'ignore';
