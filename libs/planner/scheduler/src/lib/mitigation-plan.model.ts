import type { Mechanic, MechanicHit, MitigationTool, PlannedUse } from './plan.model';

// A use the mitigation pass could add, and the damage it would take off.
export interface Candidate {
  use: PlannedUse;
  tool: MitigationTool;
  value: number;
  // The uses that let it go up, planned with it: an Adloquium before
  // Deployment Tactics, and Recitation before that one.
  granted?: Granted[];
}

export interface Granted {
  use: PlannedUse;
  tool: MitigationTool;
}

// What a hit does with the uses up, and the most it may do (`limit`: the
// HP it lands on less the margin).
export interface TakeBackChecks {
  hit: (m: Mechanic, h: MechanicHit) => { damage: number; invulnerable: boolean };
  limit: (m: Mechanic, h: MechanicHit) => number;
}
