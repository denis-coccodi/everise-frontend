import { DataCentre } from '@everise/core/api-types';
import { SortOrder, isSortOrder } from './listing-sort';

// The data centre, world and order the member last picked, kept in this
// browser. Everise plays on Light, from Odin: that's where the page starts.
export interface PartyFinderPreferences {
  dataCentre: DataCentre;
  // The world picked on each data centre; null for all worlds.
  worlds: Partial<Record<DataCentre, number | null>>;
  sort: SortOrder;
}

const KEY = 'partyFinder';
const ODIN = 66;

export const DEFAULT_PREFERENCES: PartyFinderPreferences = {
  dataCentre: 'Light',
  worlds: { Light: ODIN },
  sort: 'game',
};

export function loadPreferences(): PartyFinderPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PartyFinderPreferences> | null;
    // A data centre's name; the backend says if it doesn't know it.
    if (saved && typeof saved.dataCentre === 'string' && /^[A-Z][a-z]+$/.test(saved.dataCentre)) {
      return {
        dataCentre: saved.dataCentre,
        worlds: { ...DEFAULT_PREFERENCES.worlds, ...saved.worlds },
        sort: isSortOrder(saved.sort) ? saved.sort : DEFAULT_PREFERENCES.sort,
      };
    }
  } catch {
    // Storage blocked or garbled: start from the defaults.
  }
  return DEFAULT_PREFERENCES;
}

export function savePreferences(preferences: PartyFinderPreferences) {
  try {
    localStorage.setItem(KEY, JSON.stringify(preferences));
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
}
