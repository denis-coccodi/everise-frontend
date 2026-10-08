import { PartyFinderListing, PartyRole } from '@everise/core/api-types';

// What the Party Finder page narrows the listings down to.
export interface PartyFinderFilters {
  // The world the member plays from: listings joinable from it (every
  // data-centre-wide one, and world-only ones made there). Null: all.
  world: number | null;
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

export const NO_DUTY = 'None';

// xivpf's categories (the game's Party Finder tabs), as the page names them.
const CATEGORY_NAMES: Record<string, string> = {
  DutyRoulette: 'Duty Roulette',
  Dungeon: 'Dungeons',
  Guildhest: 'Guildhests',
  Trial: 'Trials',
  Raid: 'Raids',
  HighEndDuty: 'High-end Duty',
  PvP: 'PvP',
  GoldSaucer: 'Gold Saucer',
  Fate: 'FATEs',
  TreasureHunt: 'Treasure Hunt',
  TheHunt: 'The Hunt',
  GatheringForay: 'Gathering Forays',
  DeepDungeon: 'Deep Dungeons',
  FieldOperation: 'Field Operations',
  VariantAndCriterionDungeon: 'V&C Dungeons',
  [NO_DUTY]: 'No duty',
};

export const HIGH_END = 'HighEndDuty';

// The kinds of high-end duty, by the game's own name endings, in the order
// the page lists them.
const HIGH_END_KINDS = ['Ultimate', 'Savage', 'Extreme', 'Unreal', 'Chaotic', 'Other'];

export function categoryName(category: string) {
  if (category.startsWith(`${HIGH_END}:`)) {
    const kind = category.slice(HIGH_END.length + 1);
    return kind === 'Other' ? 'Other high-end' : kind;
  }
  return CATEGORY_NAMES[category] ?? category.replace(/([a-z])([A-Z])/g, '$1 $2');
}

// A listing's category, with high-end duties split by kind:
// "HighEndDuty:Ultimate", "HighEndDuty:Extreme"... The Minstrel's Ballads
// are extreme trials without "(Extreme)" in their name.
export function kindOf(listing: PartyFinderListing) {
  if (listing.category !== HIGH_END) return listing.category;
  const name = listing.duty ?? '';
  const kind = name.match(/\((Ultimate|Savage|Extreme|Unreal|Chaotic)\)$/)?.[1];
  if (kind) return `${HIGH_END}:${kind}`;
  return `${HIGH_END}:${name.startsWith("The Minstrel's Ballad") ? 'Extreme' : 'Other'}`;
}

function inCategory(listing: PartyFinderListing, category: string) {
  return category === HIGH_END ? listing.category === HIGH_END : kindOf(listing) === category;
}

// What a listing is for: its duty, or its category when it has none.
export function listingTitle(listing: PartyFinderListing) {
  return listing.duty ?? categoryName(listing.category);
}

export function joinableFrom(listing: PartyFinderListing, world: number | null) {
  return world === null || !listing.worldOnly || listing.world.id === world;
}

function searchText(listing: PartyFinderListing) {
  return [
    listingTitle(listing),
    listing.description,
    listing.recruiter,
    categoryName(listing.category),
    listing.homeWorld.name,
  ]
    .join(' ')
    .toLowerCase();
}

export function matchesFilters(listing: PartyFinderListing, filters: PartyFinderFilters) {
  if (!joinableFrom(listing, filters.world)) return false;
  if (listing.category === NO_DUTY && !filters.showNoDuty && filters.category !== NO_DUTY) return false;
  if (filters.category && !inCategory(listing, filters.category)) return false;
  if (filters.role && !listing.slots.some((slot) => !slot.job && slot.roles.includes(filters.role as PartyRole))) {
    return false;
  }
  if (filters.beginnersOnly && !listing.beginnersWelcome) return false;
  const words = filters.search.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length) {
    const text = searchText(listing);
    if (!words.every((word) => text.includes(word))) return false;
  }
  return true;
}

// The categories the listings have, for the page's list: the others by
// name, "No duty" last, and the kinds of high-end duty apart (the page
// groups them under "High-end Duty").
export function categoriesIn(listings: PartyFinderListing[]) {
  const categories = [...new Set(listings.map((listing) => listing.category))].filter(
    (category) => category !== HIGH_END,
  );
  const kinds = new Set(listings.map(kindOf));
  return {
    others: categories
      .filter((category) => category !== NO_DUTY)
      .sort((a, b) => categoryName(a).localeCompare(categoryName(b)))
      .concat(categories.includes(NO_DUTY) ? [NO_DUTY] : []),
    highEnd: HIGH_END_KINDS.map((kind) => `${HIGH_END}:${kind}`).filter((kind) => kinds.has(kind)),
  };
}
