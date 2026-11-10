---
title: Events and Venues
parent: Features
nav_order: 6
---

# Events and Venues

Backend: [Events and Venues](/docs/backend/features/events-and-venues.html).

Both are open to everyone. Their pages are kept out of search engines (`robots: noindex`), since Partake and FFXIV Venues are their homes.

## Events

| Library                     | What                                                                          |
| --------------------------- | ----------------------------------------------------------------------------- |
| `events/feature-events`     | `/events` (`?dc=`, `?search=`) and `/events/<id>`                             |
| `events/feature-event-card` | `<cdt-event-card>` (a widget: the Events page, and compact on a venue's page) |
| `events/data-access`        | `EventsStore`, `EventPageStore`, `EventShareStore`, `event-time.ts`           |

- **The list:** events on now come first, then the rest under the day they start. It refreshes every five minutes while the page is in view.
- **Search:** finds events by title, host, world, location, tags or summary (`matchesSearch` in `core/data-access`, ignoring case and accents). The search is kept when switching data centre.
- **An event's page:**
  - the organisers' description as sanitised Markdown (`cdt-rich-text`; `markLostLinks` points lines whose link Partake lost to the Partake page);
  - the venue, when the backend is sure of it;
  - its day and hours in the visitor's time;
  - **Share to Discord** for members, until it ends.
- **Times** (`event-time.ts`): "On now, until 23:00", "Starts tomorrow at 19:00", in the visitor's own time. The Venues page reuses it.

## Venues

| Library                 | What                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `venues/feature-venues` | `/venues` (`?dc=`, Light by default; `?search=`) and `/venues/<id>`                  |
| `venues/data-access`    | `VenuesStore`, `VenuePageStore`, `VenueShareStore`, `venue-time.ts`, `text-links.ts` |

- **The list:** venues open now come first, then the rest of the week. It refreshes every five minutes while in view. The search covers name, world, address, tags and description.
- **A venue's page:**
  - its whole description, with web addresses linked by `text-links.ts`; the owners' text is **never read as HTML**;
  - its regular openings ("Every Friday 20:00 – 01:59");
  - **Upcoming events here**, as compact event cards: first on phones, at the top of the side column on wide screens.
