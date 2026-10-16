# venues-data-access

The Venues pages' data. `VenuesService`: `GET /api/venues` (a data centre's venues opening this week, as the backend last read them from FFXIV Venues), `GET /api/venues/:id` (one venue with its regular openings) and `POST /api/venues/discord` (sharing one in the Everise Discord).

- `VenuesStore`: the list page's state: the data centre in the query string (`?dc=chaos`; Light without one), its venues split into those open now and those opening later, refreshed every five minutes while the page is in view.
- `VenuePageStore`: one venue's page, by the id in the address, with the week's events the backend is sure are held there; `missing` when the backend doesn't list it.
- `VenueShareStore`: the share window, and sending the share.
- `venue-time.ts` says when a venue opens, how an opening repeats and its hours, in the visitor's own time ("Opens tomorrow at 19:00", "Every 2 weeks on Friday", "20:00 – 01:59"); `text-links.ts` cuts the owners' text into words and web addresses to link; `venues-query.ts` reads and writes the data centre in the query string.
