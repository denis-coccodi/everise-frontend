# venues-data-access

The Venues page's data: `VenuesService` (`GET /api/venues`, a data centre's player-run venues opening this week, as the backend last read them from FFXIV Venues) and `VenuesStore`, the page's state: the data centre in the query string (`?dc=chaos`; Light without one), its venues split into those open now and those opening later, refreshed every five minutes while the page is in view. `venue-time.ts` says when a venue opens in the visitor's own time ("Opens tomorrow at 19:00"); `venues-query.ts` reads and writes the data centre in the query string.
