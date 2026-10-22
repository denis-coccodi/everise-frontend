import type { CompareRow } from './compare-log.model';
import type { PlanEntry } from './plan-log.model';
import type { LogEntry } from './player-log.model';

// Entries this close to a row's first share it: a mechanic's hit as played
// lands on the same row as the plan's, which is timed at the mechanic's
// first hit.
const SAME_ROW_MS = 1000;

// A player's pull as played and as planned, side by side: a row per moment,
// in time order, each side in its own order.
export function compareLog(played: LogEntry[], planned: PlanEntry[]): CompareRow[] {
  const entries = [
    ...played.map((entry) => ({ at: entry.at, played: entry })),
    ...planned.map((entry) => ({ at: entry.at, planned: entry })),
  ].sort((a, b) => a.at - b.at);
  const rows: CompareRow[] = [];
  for (const entry of entries) {
    let row = rows.at(-1);
    if (!row || entry.at - row.at > SAME_ROW_MS) {
      row = { at: entry.at, played: [], planned: [] };
      rows.push(row);
    }
    if ('played' in entry) row.played.push(entry.played);
    else row.planned.push(entry.planned);
  }
  return rows;
}
