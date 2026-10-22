import type { ReportPull } from '@everise/core/api-types';

// The pulls of one fight (an encounter), in the order they were pulled.
export interface EncounterPulls {
  encounterId: number;
  name: string;
  kind: ReportPull['kind'];
  pulls: ReportPull[];
}
