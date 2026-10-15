import { VenueDataCentre } from '@everise/core/api-types';

// The Venues page keeps its data centre in the query string (?dc=chaos), in
// lower case, so a link brings it along. Without one, it's Light: Everise's.
const HOME_DATA_CENTRE: VenueDataCentre = 'Light';

// "chaos" (from the address) → "Chaos"; the backend says if it doesn't know it.
export function venueDataCentre(query: { get(name: string): string | null }): VenueDataCentre {
  const id = query.get('dc')?.trim().toLowerCase() ?? '';
  if (!/^[a-z]+$/.test(id)) return HOME_DATA_CENTRE;
  return (id.charAt(0).toUpperCase() + id.slice(1)) as VenueDataCentre;
}

// The query for a data centre's venues.
export function venuesQuery(dataCentre: string) {
  return { dc: dataCentre.toLowerCase() };
}
