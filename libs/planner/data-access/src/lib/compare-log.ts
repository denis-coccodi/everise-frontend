import type { CompareRow } from './compare-log.model';
import { isGcd } from './plan-gcds';
import type { PlanEntry } from './plan-log.model';
import type { LogEntry } from './player-log.model';

// Entries this close to a row's first share it: a mechanic's hit as played
// lands on the same row as the plan's, which is timed at the mechanic's
// first hit.
const SAME_ROW_MS = 1000;
// A planned GCD's row holds what's woven after it, up to the next GCD.
const WEAVE_ROOM_MS = 2000;

// A player's pull as played and as planned, side by side: a row per moment,
// in time order. On the plan's side every GCD starts a row (or joins one
// with nothing of the plan's yet), and every oGCD goes in the row of the
// GCD before it, woven after it, as in the game: a Psyche pressed before
// Eukrasia is in the previous GCD's row (`withStandInGcds` gives every
// oGCD a GCD before it).
export function compareLog(played: LogEntry[], planned: PlanEntry[]): CompareRow[] {
  const entries = [
    ...played.map((entry) => ({ at: entry.at, played: entry })),
    ...planned.map((entry) => ({ at: entry.at, planned: entry })),
  ].sort((a, b) => a.at - b.at || Number(gcdOf(b)) - Number(gcdOf(a)));
  const rows: CompareRow[] = [];
  let until = -Infinity;
  // The row of the plan's last GCD, where its oGCDs after it go.
  let gcdRow: CompareRow | undefined;
  for (const entry of entries) {
    let row = rows.at(-1);
    const gcd = 'planned' in entry && isGcd(entry.planned);
    const woven = 'planned' in entry && entry.planned.kind === 'use' && !gcd && entry.at >= 0 && gcdRow;
    if (woven) row = gcdRow;
    else if (!row || entry.at > until || (gcd && row.planned.length > 0)) {
      row = { at: entry.at, shownAt: entry.at, played: [], planned: [], severity: null };
      rows.push(row);
      until = entry.at + SAME_ROW_MS;
    }
    if (gcd) {
      until = Math.max(until, entry.at + WEAVE_ROOM_MS);
      gcdRow = row;
    }
    if (!row) continue;
    const castAt = 'played' in entry ? castStart(entry.played) : castStart(entry.planned);
    if (castAt !== null && castAt !== undefined) row.shownAt = Math.min(row.shownAt, castAt);
    if ('played' in entry) row.played.push(entry.played);
    else row.planned.push(entry.planned);
    const hit = 'played' in entry ? entry.played : entry.planned;
    if (hit.kind === 'hit' && !row.severity) row.severity = hit.severity;
  }
  for (const row of rows) row.planned.sort((a, b) => Number(isGcd(b)) - Number(isGcd(a)) || a.at - b.at);
  return rows;
}

const castStart = (entry: LogEntry | PlanEntry) => ('castAt' in entry ? entry.castAt : null);

const gcdOf = (entry: { played: LogEntry } | { planned: PlanEntry }) => 'planned' in entry && isGcd(entry.planned);
