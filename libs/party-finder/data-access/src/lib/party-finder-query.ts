import { DataCentre, PartyRole } from '@everise/core/api-types';
import { PartyFinderFilters, categoryFromId, categoryId } from './listing-filters';
import { SortOrder, isSortOrder } from './listing-sort';

// Everything the Party Finder page shows lives in its query string, and only
// there: what the page shows is what the query says, so a link (or a
// bookmark, or Back) brings it along. Every choice is named by an id, in
// lower case with words joined by dashes:
//   dc=light                the data centre
//   world=odin              the world the member plays from (none: all worlds)
//   category=high-end-duty-savage   slot=healer   sort=ending-soon
//   search=coil             the words to find, as typed
//   no-duty=show  beginners=only    the two switches, when on
//   page=2                  the page of listings, after the first
// What is at its default is left out, except the data centre. A query
// without one is someone arriving at /party-finder: they get Everise's own
// view, Light from Odin. Picking a data centre, Light too, shows all its
// worlds.

export interface PartyFinderSelection {
  dataCentre: DataCentre;
  filters: PartyFinderFilters;
  sort: SortOrder;
  page: number;
}

// Everise's home: where /party-finder starts.
const HOME_DATA_CENTRE = 'Light';
const HOME_WORLD = 'odin';

const ROLES: PartyRole[] = ['tank', 'healer', 'dps'];

// "light" (from the address) → "Light"; the backend says if it doesn't know it.
export function dataCentreName(id: string): DataCentre {
  return (id.charAt(0).toUpperCase() + id.slice(1).toLowerCase()) as DataCentre;
}

// A data centre's id in the query string: its name in lower case.
export function dataCentreId(dataCentre: string) {
  return dataCentre.toLowerCase();
}

// The query for a data centre's page, as a link elsewhere opens it.
export function dataCentreQuery(dataCentre: string) {
  return { dc: dataCentreId(dataCentre) };
}

// A listing's own page, by its id (which names its data centre):
// /party-finder/listings/light-1789630212-1. Anyone with the link finds it
// while it's up.
export function listingPage(listing: { id: string }) {
  return `/party-finder/listings/${encodeURIComponent(listing.id)}`;
}

// What a query string asks for; what it leaves out or gets wrong is the
// default.
export function selectionFromQuery(query: { get(name: string): string | null }): PartyFinderSelection {
  // An id: lower case letters, digits and dashes.
  const id = (param: string) => {
    const value = query.get(param)?.trim().toLowerCase() ?? '';
    return /^[a-z0-9-]+$/.test(value) ? value : '';
  };
  const dc = id('dc');
  const role = id('slot');
  const sort = id('sort');
  const page = Number(query.get('page'));
  const category = id('category');
  return {
    dataCentre: dataCentreName(dc || HOME_DATA_CENTRE),
    filters: {
      world: id('world') || (dc ? null : HOME_WORLD),
      category: category ? categoryFromId(category) : '',
      role: ROLES.find((r) => r === role) ?? '',
      search: query.get('search') ?? '',
      showNoDuty: query.get('no-duty') === 'show',
      beginnersOnly: query.get('beginners') === 'only',
    },
    sort: isSortOrder(sort) ? sort : 'game',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

// The query parameters for a selection; null (no parameter) for what is at
// its default.
export function selectionToQuery({ dataCentre, filters, sort, page }: PartyFinderSelection) {
  return {
    dc: dataCentreId(dataCentre),
    world: filters.world,
    category: filters.category ? categoryId(filters.category) : null,
    slot: filters.role || null,
    search: filters.search || null,
    sort: sort === 'game' ? null : sort,
    'no-duty': filters.showNoDuty ? 'show' : null,
    beginners: filters.beginnersOnly ? 'only' : null,
    page: page > 1 ? String(page) : null,
  };
}
