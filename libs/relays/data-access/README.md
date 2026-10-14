# relays-data-access

The Weekly and Hunts tabs' data, which the Everise Discord relays from the channels it follows (the backend's `src/relays`): `RelaysService` (`GET /api/weekly`, `GET /api/hunts`), `WeeklyStore` (the next resets, this week's Fashion Report and Island Sanctuary recommendations with the days they're for; asked again every 10 minutes, the countdowns moving every 30 seconds) and `HuntsStore` (the hunt trains to come, running and last started, a section per data centre in the backend's order, Light first; asked again every minute while the tab is in view).
