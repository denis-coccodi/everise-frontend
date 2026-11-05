// One player's part of a mechanic.
export interface MechanicHit {
  player: number;
  // The damage before any mitigation or shield.
  unmitigated: number;
  // What they took in the pull, after what was up then.
  asPlayed: number;
  // A failed mechanic (an unsoaked tower, a missed stack: `failed`), and
  // whether the plan takes it as avoided (asked to, or nothing saves them).
  failed?: boolean;
  avoidable: boolean;
  // One the fight doesn't let kill: the log has them at no HP after it, yet
  // alive (Dancing Mad's Black Antilight). It leaves them 1 HP at worst.
  leavesOneHp?: true;
  // Its damage estimated: an invulnerability blocked it in the pull, so the
  // log has none (`blockedHits`): from the pull's own hits of the attack, or
  // other groups' kills. Or past a wipe's end, from the kill completing it.
  estimated?: 'pull' | 'clears' | 'completion';
}

export type DamageType = 'physical' | 'magic' | 'unique';

// One boss attack landing on one or more players at once: a raidwide, a tank
// buster, or something aimed at a few.
export interface Mechanic {
  id: number;
  at: number;
  action: number;
  name: string;
  kind: 'raidwide' | 'tankbuster' | 'targeted';
  // Which share of a mitigation counts: physical or magic, none on unique
  // damage; null when the log doesn't say.
  damageType: DamageType | null;
  hits: MechanicHit[];
  // A wipe nothing saves anyone from, taken as avoided and left out of the
  // counts: an enrage, or one that may be (`enrages`).
  wipe?: 'enrage' | 'maybe';
}
