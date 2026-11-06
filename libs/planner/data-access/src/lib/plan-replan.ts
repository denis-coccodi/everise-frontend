// The players last replanned, remembered in this browser so the next
// report replans them by default (the member's own character, mostly):
// "<name>@<server>" each, as JSON.
const REPLAN_KEY = 'planner.replan';

export const characterKey = (p: { name: string; server: string | null }) => `${p.name}@${p.server ?? ''}`;

export function storedReplan(): string[] {
  try {
    const keys: unknown = JSON.parse(localStorage.getItem(REPLAN_KEY) ?? '[]');
    return Array.isArray(keys) ? keys.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

export function saveReplan(keys: string[]) {
  try {
    localStorage.setItem(REPLAN_KEY, JSON.stringify(keys));
  } catch {
    // Not remembered; it still applies to this visit.
  }
}
