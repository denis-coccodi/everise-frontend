// A skill the user put in the plan, or took out of it: whose, which, and
// when (ms from the pull's start); an added single-target one goes on
// `target` (left out, the planner's pick: the user themself).
export interface PlanEdit {
  player: number;
  action: number;
  at: number;
  target?: number | null;
}

// The user's edits: added skills stay where put, and the plan is made
// around them; a removed one isn't planned at that moment again (it may be
// anywhere else it's needed).
export interface PlanEdits {
  added: PlanEdit[];
  removed: PlanEdit[];
}

// A skill the user could add at a moment, for the picker: whether it fits
// there, and if not, why ("Recast: back at 2:14"); a GCD names the one of
// theirs it takes the place of.
export interface EditChoice {
  action: number;
  name: string;
  gcd: boolean;
  ok: boolean;
  reason: string | null;
  replaces: string | null;
}
