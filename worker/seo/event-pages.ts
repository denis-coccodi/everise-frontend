import { PageMeta, SITE_NAME, text } from './page-meta';
import { venuePath } from './venue-pages';

// The parts of an event the pages' words use (GET /api/events, /api/events/:id).
interface CommunityEvent {
  id: number;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  dataCentre: string | null;
  world: string | null;
  location: string | null;
  tags: string[];
  banner: string | null;
  team: { name: string } | null;
  url: string;
}

// GET /api/events: the coming week's.
export interface EventList {
  events: CommunityEvent[];
}

// GET /api/events/:id: an event, its description, and the venue it's at.
export interface EventFound {
  event: CommunityEvent & { description: string };
  venue: { id: string; name: string } | null;
}

const EVENTS_INTRO =
  'Final Fantasy XIV community events this week: club nights, concerts, markets and more, ' +
  'from Partake, with where and when, in your own time.';

// An event's page address.
export const eventPath = (id: number) => `/events/${id}`;

// The Events page: what it is, and a link to each of the week's events.
export function eventsPage(list: EventList | undefined): PageMeta {
  const events = list?.events ?? [];
  const items = events.map(
    (event) =>
      `<li><a href="${eventPath(event.id)}">${text(event.title)}</a>${
        event.world ? ` · ${text(event.world)}` : ''
      }</li>`,
  );
  return {
    title: `FFXIV events this week · community events · ${SITE_NAME}`,
    description: `${events.length ? `${events.length} events this week. ` : ''}${EVENTS_INTRO}`,
    path: '/events',
    body:
      `<h1>Events this week</h1><p>${text(EVENTS_INTRO)}</p>` +
      (items.length ? `<ul>${items.join('')}</ul>` : '') +
      `<p><a href="/venues">Venues opening this week</a></p>`,
  };
}

// An event's page: what, when, where, who runs it, and its venue's page.
export function eventPage(found: EventFound, siteUrl: string): PageMeta {
  const { event, venue } = found;
  const where = [event.location, event.world, event.dataCentre].filter(Boolean).join(', ');
  const when = `${event.startsAt.slice(0, 16).replace('T', ' ')} UTC`;
  const path = eventPath(event.id);
  const description = [event.summary, where, when].filter(Boolean).join(' · ');
  return {
    title: `${event.title}${event.world ? ` · ${event.world}` : ''} · FFXIV event · ${SITE_NAME}`,
    previewTitle: event.title,
    description: description.slice(0, 300),
    path,
    image: event.banner ?? undefined,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        url: siteUrl + path,
        startDate: event.startsAt,
        endDate: event.endsAt,
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
        location: { '@type': 'VirtualLocation', url: event.url },
        ...(event.banner ? { image: [event.banner] } : {}),
        ...(event.summary ? { description: event.summary } : {}),
        ...(event.team ? { organizer: { '@type': 'Organization', name: event.team.name } } : {}),
      },
    ],
    body:
      `<h1>${text(event.title)}</h1>` +
      `<p>${text(when)}${where ? ` · ${text(where)}` : ''}</p>` +
      (event.team ? `<p>By ${text(event.team.name)}</p>` : '') +
      descriptionText(event.description) +
      (event.tags.length ? `<p>${text(event.tags.join(' · '))}</p>` : '') +
      (venue ? `<p>At <a href="${venuePath(venue.id)}">${text(venue.name)}</a></p>` : '') +
      `<p><a href="/events">More events this week</a></p>`,
  };
}

// The most an event page's words carry of its description.
const MAX_DESCRIPTION = 3000;

// The organisers' Markdown as plain paragraphs, its pictures left out.
function descriptionText(markdown: string): string {
  const words = markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, '').slice(0, MAX_DESCRIPTION);
  return words
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${text(block)}</p>`)
    .join('');
}
