// What the scheduler plans from and what it answers. Times are ms from the
// pull's start.

export interface PlanOptions {
  // The HP each hit must leave, as a share of max HP (0.1: 10%).
  margin: number;
}

// One player's part of a mechanic.
export interface MechanicHit {
  player: number;
  // The damage before any mitigation or shield.
  unmitigated: number;
  // What they took in the pull, after what was up then.
  asPlayed: number;
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
}

// A mitigation or shield a player can use: an action and what it lowers or
// absorbs, for whom.
export interface MitigationTool {
  player: number;
  action: number;
  name: string;
  recastMs: number;
  charges: number;
  // A weaponskill or spell: it costs a GCD the player would deal damage
  // with, so the plan uses it only where nothing else will do.
  gcd: boolean;
  // Actions of one player in the same group share their recast.
  group: string;
  // What it spends besides its recast, when that's what really limits it
  // (a gauge, a card, a buff another action grants).
  pool: ToolPool | null;
  effects: MitigationEffect[];
}

// A player's resource some actions spend one of: it fills one every
// `gainMs`, up to `max`, and starts full.
export interface ToolPool {
  name: string;
  gainMs: number;
  max: number;
}

export interface MitigationEffect {
  // `target`: the user or one party member, picked per use.
  target: 'self' | 'target' | 'party' | 'enemies';
  // The share of physical and of magic damage it takes off (0.1: 10%; 0
  // for a shield). None of unique damage.
  physical: number;
  magic: number;
  // What a shield absorbs after mitigation; null for a mitigation.
  shield: ShieldSize | null;
  // How many hits on a player a shield absorbs: it breaks on the first (as
  // the planner counts it), and one renewed each time it breaks (Haima)
  // lasts more.
  hits: number;
  durationMs: number;
  // The status, as the game names it.
  status: string;
  // Effects with one key don't stack: two Reprisals count once, and so do
  // Troubadour and Tactician.
  stack: string;
}

// A set amount of HP, or a share of the max HP of whoever gets it.
export type ShieldSize = { hp: number } | { maxHpShare: number };

// An action that restores HP: a healer's heal, or the heal a mitigation
// also gives (Kerachole's regen, Shake It Off's heal).
export interface HealTool {
  player: number;
  action: number;
  name: string;
  recastMs: number;
  charges: number;
  gcd: boolean;
  // The cast bar's length: it heals that long after it's used.
  castMs: number;
  group: string;
  pool: ToolPool | null;
  effects: HealEffect[];
  // Null for a heal that lands as it's cast.
  delayed: DelayedHeal | null;
}

// A heal that lands later than it's used: Earthly Star's, once the star has
// grown (10s, set off with Stellar Detonation) or on its own (20s); or
// Excogitation's, when its target drops to half their HP, or when it ends.
export interface DelayedHeal {
  // The delays it can be planned with, the one that needs nothing more
  // first; a triggered heal's is when it ends.
  delaysMs: number[];
  // What sets it off sooner than the first; null when nothing does.
  release: { action: number; name: string } | null;
  // The share of max HP at or below which it goes off at once, before its
  // delay runs out (Excogitation: 0.5); null when it waits for it.
  belowShare: number | null;
  // Its heal's name in the log, an action's or a status's.
  loggedAs: string;
}

// A heal, or healing over time: `ticks` heals of `size`, every 3 seconds
// from 3 seconds after it lands.
export interface HealEffect {
  target: 'self' | 'target' | 'party';
  size: ShieldSize;
  ticks: number;
  // The healing over time's status (its ticks name it in the log).
  status: string | null;
  statusId: number | null;
}

// When a player should use an action, and the mechanics it covers (or,
// for a heal, the mechanic it heals them up for).
export interface PlannedUse {
  player: number;
  action: number;
  name: string;
  at: number;
  // The party member a `target` effect goes on.
  target: number | null;
  covers: number[];
}

// A hit as the plan leaves it.
export interface PlannedHit {
  mechanic: number;
  player: number;
  unmitigated: number;
  planned: number;
  asPlayed: number;
  // What shields absorbed of it, after mitigation.
  absorbed: number;
  // Their HP when it lands, with the plan's heals; null when the pull
  // doesn't say their max HP.
  hpBefore: number | null;
  // The planned damage as a share of their max HP; null when the pull
  // doesn't say their max HP.
  share: number | null;
  // Whether it leaves at least the margin of their HP.
  safe: boolean;
  // The mitigations and shields the plan has up for it.
  covers: string[];
}

export interface Plan {
  mechanics: Mechanic[];
  uses: PlannedUse[];
  hits: PlannedHit[];
}
