# events-data-access

The Events pages' data. `EventsService`: `GET /api/events` (the community's FFXIV events going on or starting this week, as the backend last read them from Partake, rated at most MATURE), `GET /api/events/:id` (one event with its description) and `POST /api/events/discord` (sharing one in the Everise Discord).

- `EventsStore`: the list page's state: the week's events, those on now apart from the rest, which are grouped by the day they start; the data centre in the query string (`?dc=chaos`; every data centre without one), refreshed every five minutes while the page is in view.
- `EventPageStore`: one event's page, by the id in the address; `missing` when the backend doesn't list it.
- `EventShareStore`: the share window, and sending the share.
- `event-time.ts` says when an event is, its hours and the day it starts, in the visitor's own time ("On now, until 23:00", "Starts tomorrow at 19:00", "20:00 – 01:00", "Saturday 17 October"); the Venues page uses it for a venue's events too. `events-query.ts` reads and writes the data centre in the query string.
