// An invulnerability on a mechanic, as a group's strategy has it (one tank
// taking a mechanic the two would trade, or standing where it makes the
// mechanic simpler); `mechanic` null: never this one.
export interface InvulnerabilityChoice {
  player: number;
  action: number;
  mechanic: number | null;
}

// What there is to choose from for the tanks' invulnerabilities: each
// tank's, the mechanics that hit each player, and where the pull had them.
export interface InvulnerabilityOptions {
  tools: { player: number; action: number; name: string }[];
  mechanics: { id: number; at: number; name: string; players: number[] }[];
  played: InvulnerabilityChoice[];
}
