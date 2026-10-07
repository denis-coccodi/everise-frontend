# party-finder-data-access

The Party Finder page's data: `PartyFinderService` (`GET /api/party-finder`, a data centre's listings as the backend last read them from xivpf.com) and `PartyFinderStore`, the page's state: the chosen data centre's listings, refreshed every 30 seconds while the page is in view, and the filters (world, category, open role, search, listings without a duty, beginners welcome). `listing-filters.ts` holds the filtering and the category names; the data centre and world picked are remembered in the browser (Light and Odin to start).
