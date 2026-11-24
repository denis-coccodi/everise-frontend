import { HealPairing, HealTool, MitigationTool, PlannedUse, ToolPool } from './plan.model';
import type { HpEvent } from './hp-track.model';

// What an action already planned uses up: its recast, its pool, a GCD or a
// weave slot (and the grant it uses, or gives).
export interface Spent {
  player: number;
  action: number;
  at: number;
  group: string;
  pool: ToolPool | null;
  gcd: boolean;
  castMs: number;
  // Its first press's moment, in a weave slot of its own (Tempera Coat: `PlannedUse.firstAt`).
  firstAt?: number;
}

// A heal the plan could use, and what it makes up.
export interface Candidate {
  use: PlannedUse;
  tool: HealTool;
  events: HpEvent[];
  value: number;
  // How long after it's used it heals, past its cast (a delayed heal's).
  delayMs: number;
  // The oGCD up before it that makes it bigger (Plenary Indulgence).
  paired: Paired | null;
}

// A heal with the oGCD that goes with it, and the barrier the two leave
// (Neutral Sect's): a shield for the hits after, as the plan's mitigations.
export interface Paired {
  use: PlannedUse;
  pairing: HealPairing;
  events: HpEvent[];
  barrier: { use: PlannedUse; tool: MitigationTool } | null;
  // In the window of the pairing's use already planned (`use`): nothing new is pressed.
  open?: boolean;
  // When its heal on top is read (Horoscope Helios, after the next hit).
  readAt?: number;
}

// The fairy's own heals, worked out for the plan (`events`), and the
// heals of the pull they replace (`recalculated`, player:action).
export interface FairyHealing {
  events: HpEvent[];
  recalculated: string[];
}
