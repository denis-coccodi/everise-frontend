import { Venue, VenueList } from '@everise/core/api-types';

// Realistic venues and lists for the specs.
const HOUR = 3_600_000;

// A venue opening `opensIn` hours from now (negative: open since), for
// four hours.
export function venue(id: string, opensIn: number, changes: Partial<Venue> = {}): Venue {
  const opens = Date.now() + opensIn * HOUR;
  return {
    id,
    name: `Venue ${id}`,
    description: ['A tavern in the desert.', 'Memories last.'],
    banner: `https://images.ffxivvenues.com/${id}/banner`,
    world: 'Shiva',
    address: 'Goblet, Ward 25 (subdivision), Plot 48',
    tags: ['Tavern', 'Drink'],
    website: 'https://example.com/',
    discord: 'https://discord.gg/example',
    url: `https://ffxivvenues.com/venue/${id}`,
    notices: [],
    opensAt: new Date(opens).toISOString(),
    closesAt: new Date(opens + 4 * HOUR).toISOString(),
    openNow: opensIn <= 0,
    ...changes,
  };
}

export function venueList(changes: Partial<VenueList> = {}): VenueList {
  return {
    dataCentre: 'Light',
    regions: [
      { name: 'Europe', dataCentres: ['Light', 'Chaos'] },
      { name: 'North America', dataCentres: ['Aether', 'Crystal', 'Dynamis', 'Primal'] },
      { name: 'Oceania', dataCentres: ['Materia'] },
    ],
    fetchedAt: new Date().toISOString(),
    venues: [venue('open', -1), venue('soon', 2), venue('later', 30)],
    ...changes,
  };
}
