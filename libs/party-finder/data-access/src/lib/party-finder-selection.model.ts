import type { DataCentre } from '@everise/core/api-types';
import type { PartyFinderFilters } from './listing-filters.model';
import type { SortOrder } from './listing-sort.model';

// What the Party Finder page shows, as its query string says it
// (party-finder-query.ts reads and writes it).
export interface PartyFinderSelection {
  dataCentre: DataCentre;
  filters: PartyFinderFilters;
  sort: SortOrder;
  page: number;
}
