import type { Plan, PlanEdits } from '@everise/planner/scheduler';
import { pullClock } from './pull-time';

// The user's edits to a pull's plan, remembered in this browser by report
// and pull: "planner.edits:<code>:<pull>", as JSON.
export const editsKey = (code: string, pullId: number) => `planner.edits:${code}:${pullId}`;
export const NO_EDITS: PlanEdits = { added: [], removed: [] };

export function storedEdits(key: string): PlanEdits {
  try {
    const edits = JSON.parse(localStorage.getItem(key) ?? 'null') as PlanEdits | null;
    return edits && Array.isArray(edits.added) && Array.isArray(edits.removed) ? edits : NO_EDITS;
  } catch {
    return NO_EDITS;
  }
}

export function saveEdits(key: string, edits: PlanEdits) {
  try {
    localStorage.setItem(key, JSON.stringify(edits));
  } catch {
    // Not remembered; it still applies to this visit.
  }
}

// What an edit did when the plan after it leaves hits short that the one
// before didn't; empty when it doesn't.
export function editWarning(before: Plan | null, after: Plan | null): string {
  const shortBefore = new Set(unsafe(before));
  const newly = unsafe(after).filter((k) => !shortBefore.has(k));
  if (!newly.length) return '';
  const named = [...new Set(newly.map((k) => mechanicLabel(after, k)))];
  const hits = newly.length === 1 ? 'hit falls' : 'hits fall';
  return `This placement may be wrong: ${newly.length} more ${hits} short now (${named.join(', ')}).`;
}

// A plan's hits short of the margin, as "<mechanic>:<player>".
const unsafe = (plan: Plan | null) => (plan?.hits ?? []).filter((h) => !h.safe).map((h) => `${h.mechanic}:${h.player}`);

// "3:14 Killer Voice", for a hit's key.
function mechanicLabel(plan: Plan | null, key: string) {
  const m = plan?.mechanics.find((x) => x.id === Number(key.split(':')[0]));
  return m ? `${pullClock(m.at)} ${m.name}` : 'a hit';
}
