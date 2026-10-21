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

// One boss attack landing on one or more players at once: a raidwide, a tank
// buster, or something aimed at a few.
export interface Mechanic {
  id: number;
  at: number;
  action: number;
  name: string;
  kind: 'raidwide' | 'tankbuster' | 'targeted';
  hits: MechanicHit[];
}

// A mitigation a player can use: an action and what it lowers, for whom.
export interface MitigationTool {
  player: number;
  action: number;
  name: string;
  recastMs: number;
  charges: number;
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
  // The share of damage it takes off (0.1: 10%). Where physical and magic
  // differ, the smaller: the planner doesn't know an attack's type yet.
  share: number;
  durationMs: number;
  // The status, as the game names it.
  status: string;
  // Effects with one key don't stack: two Reprisals count once, and so do
  // Troubadour and Tactician.
  stack: string;
}

// When a player should use an action, and the mechanics it covers.
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
  // The planned damage as a share of their max HP; null when the pull
  // doesn't say their max HP.
  share: number | null;
  // Whether it leaves at least the margin.
  safe: boolean;
  // The mitigations the plan has up for it.
  covers: string[];
}

export interface Plan {
  mechanics: Mechanic[];
  uses: PlannedUse[];
  hits: PlannedHit[];
}
