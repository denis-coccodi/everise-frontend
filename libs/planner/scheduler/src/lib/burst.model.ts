// A buff or enabler a job's guides use on cooldown after the opener: every
// `everyMs` (its recast unless said), from the opener's use of it, or from
// the first GCD without one.
export interface BurstAction {
  action: number;
  everyMs?: number;
  // Placed before the heals and mitigations, not after: an astrologian's, their cards going by it.
  early?: boolean;
}

// A cast a burst action enables, within `withinMs` of it (of the step before, `fromPrevious`: a combo, or what that
// step grants): the first of `actions` the plan places, any of them the player's own (Impalement for Scarlet Delirium).
export interface FollowUp {
  actions: number[];
  withinMs: number;
  fromPrevious?: boolean;
}
