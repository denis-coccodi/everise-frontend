import type { PartyRole } from '@everise/core/api-types';
import './listing-filters';

// What the Party Finder page narrows the listings down to.
export interface PartyFinderFilters {
  // The world the member plays from: listings joinable from it (every
  // data-centre-wide one, and world-only ones made there), by its id
  // (worldId: "odin"). Null: all.
  world: string | null;
  // An xivpf category ("Trial"), a kind of high-end duty
  // ("HighEndDuty:Ultimate"), "HighEndDuty" for all of those, or '' for all.
  category: string;
  // Listings with an open slot for this role, or '' for any.
  role: PartyRole | '';
  // Words to find in the duty, description, recruiter or category.
  search: string;
  // Listings without a duty (xivpf's "None") are hidden unless asked for.
  showNoDuty: boolean;
  beginnersOnly: boolean;
}
