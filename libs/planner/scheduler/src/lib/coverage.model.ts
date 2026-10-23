import type { PlannedUse } from './plan.model';

// What the projection needs to know of the pull: each player's max HP, how
// many hits landed on a player from one moment to another (a shield breaks
// on the first of them), and what a GCD shield's size is multiplied by when
// cast with `uses` up (its caster's healing potency buffs).
export interface PullFacts {
  maxHp: Map<number, number>;
  hitsBetween(player: number, from: number, to: number): number;
  shieldTimes(use: PlannedUse, uses: PlannedUse[]): number;
}
