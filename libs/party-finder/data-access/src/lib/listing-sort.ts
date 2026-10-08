import { PartyFinderListing } from '@everise/core/api-types';
import { HIGH_END, NO_DUTY, kindOf, listingTitle } from './listing-filters';

// The orders the page can list the listings in; 'game' is the default.
export type SortOrder = 'game' | 'endingSoon' | 'recent' | 'fewestNeeded' | 'itemLevel' | 'name';

export const SORT_ORDERS: { value: SortOrder; name: string }[] = [
  { value: 'game', name: 'As in the game' },
  { value: 'endingSoon', name: 'Ending soonest' },
  { value: 'recent', name: 'Seen most recently' },
  { value: 'fewestNeeded', name: 'Fewest players needed' },
  { value: 'itemLevel', name: 'Highest item level' },
  { value: 'name', name: 'Duty name (A–Z)' },
];

export function isSortOrder(value: unknown): value is SortOrder {
  return SORT_ORDERS.some((order) => order.value === value);
}

// The game's Party Finder tabs, in its order; listings without a duty last.
const CATEGORY_ORDER = [
  'DutyRoulette',
  'Dungeon',
  'Guildhest',
  'Trial',
  'Raid',
  'HighEndDuty',
  'PvP',
  'GoldSaucer',
  'Fate',
  'TreasureHunt',
  'TheHunt',
  'GatheringForay',
  'DeepDungeon',
  'FieldOperation',
  'VariantAndCriterionDungeon',
];

function categoryRank(category: string) {
  if (category === NO_DUTY) return CATEGORY_ORDER.length + 1;
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

// High-end duty as the game lists it: savage raids, then ultimates, then
// extreme trials (as seen in game), then the rest.
const HIGH_END_ORDER = ['Savage', 'Ultimate', 'Extreme', 'Unreal', 'Chaotic', 'Other'].map(
  (kind) => `${HIGH_END}:${kind}`,
);

function kindRank(listing: PartyFinderListing) {
  return listing.category === HIGH_END ? HIGH_END_ORDER.indexOf(kindOf(listing)) : 0;
}

const openSlots = (listing: PartyFinderListing) => listing.slots.filter((slot) => !slot.job).length;

type Compare = (a: PartyFinderListing, b: PartyFinderListing) => number;

// The game's order: by tab (high-end duty by kind), then the highest level
// duty first, the newest (its sort key) among duties of one level, the
// duties without either after, by name; one duty's listings by time left,
// the least first.
const byGame: Compare = (a, b) =>
  categoryRank(a.category) - categoryRank(b.category) ||
  kindRank(a) - kindRank(b) ||
  (b.level ?? -1) - (a.level ?? -1) ||
  (b.sortKey ?? -1) - (a.sortKey ?? -1) ||
  listingTitle(a).localeCompare(listingTitle(b)) ||
  Date.parse(a.expiresAt) - Date.parse(b.expiresAt);

const COMPARE: Record<SortOrder, Compare> = {
  game: byGame,
  endingSoon: (a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt),
  recent: (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  fewestNeeded: (a, b) => openSlots(a) - openSlots(b) || byGame(a, b),
  itemLevel: (a, b) => b.minItemLevel - a.minItemLevel || byGame(a, b),
  name: (a, b) => listingTitle(a).localeCompare(listingTitle(b)),
};

// A new array in that order. Ties go by id, so a refresh doesn't reshuffle
// listings that compare the same.
export function sortListings(listings: PartyFinderListing[], order: SortOrder) {
  const compare = COMPARE[order];
  return [...listings].sort((a, b) => compare(a, b) || a.id.localeCompare(b.id));
}
