import type { PlanEntry } from './plan-log.model';
import type { LogEntry } from './player-log.model';

// One moment of a player's pull: what happened then as played, and what the
// plan has then.
export interface CompareRow {
  at: number;
  played: LogEntry[];
  planned: PlanEntry[];
}
