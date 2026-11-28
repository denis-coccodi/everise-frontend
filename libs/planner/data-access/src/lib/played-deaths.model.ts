// Why a player died in a pull as it was played (before any replanning).
// - failed: they failed the mechanic themselves (a hit far bigger than usual).
// - missedShare: a hit the party shares (a stack) had players missing, so
//   the ones in it took more; the missing ones are to blame.
// - earlierMistake: a Vulnerability Up from an earlier failure made a normal
//   hit lethal.
// - shortfall: a normal hit, but too little HP or mitigation.
// - wipe: an enrage, or a raidwide nobody survives.
// - cascade: the party was already going down; blamed like the death that
//   started it.
// - unknown: the log doesn't say what killed them.
export type DeathCause = 'failed' | 'missedShare' | 'earlierMistake' | 'shortfall' | 'wipe' | 'cascade' | 'unknown';

export interface PlayedDeath {
  player: number;
  // Ms from the pull's start.
  at: number;
  // What killed them, as the log names it; null when it doesn't say.
  killedBy: string | null;
  cause: DeathCause;
  // Who is to blame (players' ids): empty when it's nobody's in particular,
  // or the log can't tell who.
  blame: number[];
  // What happened, in words.
  reason: string;
}
