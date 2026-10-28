import { PageMeta, SITE_NAME, text } from './page-meta';

// The parts of a venue the pages' words use (GET /api/venues, /api/venues/:id).
interface Venue {
  id: string;
  name: string;
  description: string[];
  banner: string | null;
  world: string | null;
  address: string | null;
  tags: string[];
}

// GET /api/venues: one data centre's venues this week.
export interface VenueList {
  dataCentre: string;
  venues: Venue[];
}

// GET /api/venues/:id: a venue and the week's events held there.
export interface VenueFound {
  venue: Venue & { dataCentre: string | null };
  events: { id: number; title: string }[];
}

const VENUES_INTRO =
  'Player-run venues in Final Fantasy XIV opening this week: taverns, clubs, cafés and more, ' +
  'from FFXIV Venues, with where to find them and when they open.';

// A data centre's Venues page: Light's (Everise's) is /venues itself.
const venuesPath = (dataCentre: string) =>
  dataCentre === 'Light' ? '/venues' : `/venues?dc=${dataCentre.toLowerCase()}`;

// A venue's page address.
export const venuePath = (id: string) => `/venues/${encodeURIComponent(id)}`;

// The data centre the Venues page shows: "/venues?dc=chaos" → "Chaos",
// Light (Everise's) without one.
export function venuesDataCentreIn(url: URL): string {
  const name = url.searchParams.get('dc')?.toLowerCase() ?? '';
  return /^[a-z]+$/.test(name) ? name[0].toUpperCase() + name.slice(1) : 'Light';
}

// The Venues page for a data centre: what it is, and a link to each venue
// opening this week (without the list, FFXIV Venues unreachable, what the
// page is).
export function venuesPage(dataCentre: string, list: VenueList | undefined): PageMeta {
  const path = venuesPath(dataCentre);
  const venues = list?.venues ?? [];
  const items = venues.map(
    (venue) =>
      `<li><a href="${venuePath(venue.id)}">${text(venue.name)}</a>${venue.world ? ` · ${text(venue.world)}` : ''}</li>`,
  );
  return {
    title: `${dataCentre} venues this week · FFXIV player-run venues · ${SITE_NAME}`,
    description: `${venues.length ? `${venues.length} venues on ${dataCentre} this week. ` : ''}${VENUES_INTRO}`,
    path,
    body:
      `<h1>Venues on ${text(dataCentre)}</h1><p>${text(VENUES_INTRO)}</p>` +
      (items.length ? `<ul>${items.join('')}</ul>` : '') +
      `<p><a href="/events">This week's events</a></p>`,
  };
}

// A venue's page: what it is, where, and the week's events held there.
export function venuePage(found: VenueFound, siteUrl: string): PageMeta {
  const { venue, events } = found;
  const where = [venue.address, venue.world, venue.dataCentre].filter(Boolean).join(', ');
  const description = [venue.description[0], where].filter(Boolean).join(' · ') || VENUES_INTRO;
  const path = venuePath(venue.id);
  const eventItems = events.map((event) => `<li><a href="/events/${event.id}">${text(event.title)}</a></li>`);
  return {
    title: `${venue.name}${venue.world ? ` · ${venue.world}` : ''} · FFXIV venue · ${SITE_NAME}`,
    previewTitle: venue.name,
    description: description.slice(0, 300),
    path,
    image: venue.banner ?? undefined,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Place',
        name: venue.name,
        url: siteUrl + path,
        ...(where ? { address: where } : {}),
        ...(venue.banner ? { image: venue.banner } : {}),
        ...(venue.description.length ? { description: venue.description.join(' ') } : {}),
      },
    ],
    body:
      `<h1>${text(venue.name)}</h1>` +
      (where ? `<p>${text(where)}</p>` : '') +
      venue.description.map((paragraph) => `<p>${text(paragraph)}</p>`).join('') +
      (venue.tags.length ? `<p>${text(venue.tags.join(' · '))}</p>` : '') +
      (eventItems.length ? `<h2>This week's events here</h2><ul>${eventItems.join('')}</ul>` : '') +
      `<p><a href="${venuesPath(venue.dataCentre ?? 'Light')}">More venues${
        venue.dataCentre ? ` on ${text(venue.dataCentre)}` : ''
      }</a></p>`,
  };
}
