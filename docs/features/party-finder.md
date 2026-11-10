---
title: Party Finder
parent: Features
nav_order: 4
---

# Party Finder

Backend: [Party Finder](/docs/backend/features/party-finder.html).

## Libraries

| Library                             | What                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `party-finder/feature-party-finder` | The page, `/party-finder`, and a listing's own page, `/party-finder/listings/<id>`                           |
| `party-finder/feature-pf-listing`   | `<cdt-pf-listing>`, a listing's card with its party's slots (a widget: the page, the feeds and posts use it) |
| `party-finder/data-access`          | `PartyFinderStore`, `PfListingStore`, `PfShareStore`, the filters, the sort and the query string             |

## State in the address

Everything the page shows is in its query string, by id (`party-finder-query.ts`). The store reads it, writes every change back, and follows it on Back, Forward and links:

```
?dc=light&world=odin&category=high-end-duty-savage&slot=healer&search=coil&sort=ending-soon&no-duty=show&beginners=only&page=2
```

Without a data centre, the page opens on Light with all its worlds. Picking a data centre clears the world and category.

## The list

- **Refresh:** the store asks every 30 seconds while the page is in view. Nothing is kept in the browser, and a refresh keeps the reader's place.
- **Filters** (`listing-filters.ts`):
  - **World:** what can be joined from it, which is the whole data centre plus that world's own Hunt and FATE parties.
  - **Category:** every category the page knows, even with no listings, plus any new one from xivpf and the one picked.
  - **Open slot** for a role, and words to find.
  - Listings without a duty are hidden unless switched on.
- **Sort** (`listing-sort.ts`): the game's order (by tab; high-end duty by kind; then the highest level, and the newest duty among one level), or by time left, last seen, players needed, item level or name. 20 a page.

## Sharing

- **Share as post** and **Share to Discord** (`PfShareStore`):
  - the listing's card is drawn as a picture in the member's browser (`html-to-image`) and uploaded first;
  - the backend then reads the listing from the board itself.
- **Links from the Discord** carry `?from=discord`. `discordLinkGuard` asks a signed-out visitor to sign in first, then brings them back.
- **Discord-only shares** open their data centre's page, with the listing pinned under **Shared with you** while it's up.
