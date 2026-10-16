# events-feature-events

The Events pages, open to everyone.

- `/events` (`?dc=chaos`; every data centre without one): the community's FFXIV events this week (club nights, parties, races, gatherings), as Partake lists them, only those rated at most MATURE (labelled "Mature"; the backend never sends ADULT ones). Those on now come first, then the rest under the day they start, each a `cdt-event-card` (banner, title linking to the event's page, when it is in the visitor's time, where, who hosts it, the start of its description, a few tags, its team's Discord and its Partake page). `cdt-event-data-centres` links to every data centre's events and to each with events this week; the search box above the list (`?search=`, kept when switching data centre) finds events by title, host, world, location, tags or summary. State: `EventsStore`.
- `/events/<id>`: one event's own page (`cdt-event-page`): the organisers' description as Markdown (`cdt-rich-text`, sanitised as posts are), its day and hours in the visitor's time, where, who hosts it with their links, and a link to it on Partake. Members share it in the Everise Discord from there until it ends (`cdt-event-share-dialog`, an optional message); the message links back to this page. Kept out of search engines (`robots: noindex`): Partake is the event's home. State: `EventPageStore` and `EventShareStore`.

The stores are in `@everise/events/data-access`. A venue's page lists the week's events held there with the same time helpers.
