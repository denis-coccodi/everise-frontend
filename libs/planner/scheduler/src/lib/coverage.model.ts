// What the projection needs to know of the pull: each player's max HP, and
// how many hits landed on a player from one moment to another (a shield
// breaks on the first of them).
export interface PullFacts {
  maxHp: Map<number, number>;
  hitsBetween(player: number, from: number, to: number): number;
}
