import type { Severity } from '@everise/planner/scheduler';
import type { PlanEntry } from './plan-log.model';
import type { LogEntry } from './player-log.model';

// One moment of a player's pull: what happened then as played, and what the
// plan has then.
export interface CompareRow {
  at: number;
  // The time the row shows: before the pull (negative) when its first
  // entry's cast began in the countdown.
  shownAt: number;
  played: LogEntry[];
  planned: PlanEntry[];
  // How hard the row's attack hits, when it has one.
  severity: Severity | null;
}
