import type { CompareRow } from './compare-log.model';
import type { PlanEntry } from './plan-log.model';
import type { LogEntry } from './player-log.model';

// Entries this close to a row's first share it: a mechanic's hit as played
// lands on the same row as the plan's, which is timed at the mechanic's
// first hit.
const SAME_ROW_MS = 1000;
// A planned GCD's row holds what's woven after it, up to the next GCD.
const WEAVE_ROOM_MS = 2000;

// A player's pull as played and as planned, side by side: a row per moment,
// in time order, each side in its own order but for the plan's GCD, which
// comes first in its row, with the oGCDs woven after it.
export function compareLog(played: LogEntry[], planned: PlanEntry[]): CompareRow[] {
  const entries = [
    ...played.map((entry) => ({ at: entry.at, played: entry })),
    ...planned.map((entry) => ({ at: entry.at, planned: entry })),
  ].sort((a, b) => a.at - b.at);
  const rows: CompareRow[] = [];
  let until = -Infinity;
  for (const entry of entries) {
    let row = rows.at(-1);
    const gcd = 'planned' in entry && isGcd(entry.planned);
    if (!row || entry.at > until || (gcd && row.planned.some(isGcd))) {
      row = { at: entry.at, shownAt: entry.at, played: [], planned: [] };
      rows.push(row);
      until = entry.at + SAME_ROW_MS;
    }
    if (gcd) until = Math.max(until, entry.at + WEAVE_ROOM_MS);
    const castAt = 'played' in entry ? castStart(entry.played) : castStart(entry.planned);
    if (castAt !== null && castAt !== undefined) row.shownAt = Math.min(row.shownAt, castAt);
    if ('played' in entry) row.played.push(entry.played);
    else row.planned.push(entry.planned);
  }
  for (const row of rows) row.planned.sort((a, b) => Number(isGcd(b)) - Number(isGcd(a)));
  return rows;
}

const isGcd = (entry: PlanEntry) => entry.kind === 'gcd' || (entry.kind === 'use' && !!entry.gcd);

const castStart = (entry: LogEntry | PlanEntry) => ('castAt' in entry ? entry.castAt : null);
