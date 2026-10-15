# venues-feature-venues

The Venues pages, open to everyone.

- `/venues` (`?dc=chaos`; Light by default): the community's player-run venues (taverns, cafés, clubs, bathhouses...) on a data centre, as FFXIV Venues lists them, only the safe-for-work ones its team approved. Those open now come first, then the rest of the week, each a `cdt-venue-card` (banner, name linking to the venue's page, when it opens in the visitor's time, world and address, the owners' notices, the first paragraph of its description, its tags, its Discord and website). `cdt-venue-data-centres` links to each data centre's venues, by region. State: `VenuesStore`.
- `/venues/<id>`: one venue's own page (`cdt-venue-page`): the whole description with its web addresses linked (never read as HTML), its regular openings ("Every Friday 20:00 – 01:59") in the visitor's time, its tags and links, and a link to it on FFXIV Venues. Members share it in the Everise Discord from there (`cdt-venue-share-dialog`, an optional message); the message links back to this page. Kept out of search engines (`robots: noindex`): FFXIV Venues is the venue's home. State: `VenuePageStore` and `VenueShareStore`.

The stores are in `@everise/venues/data-access`.
