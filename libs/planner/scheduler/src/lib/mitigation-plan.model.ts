import type { MitigationTool, PlannedUse } from './plan.model';

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
