---
title: Duty Roulette and game data
parent: Features
nav_order: 9
---

# Duty Roulette and game data

Backend: [Duty Roulette and game data](/docs/backend/features/roulette-and-game-data.html).

## Libraries

- **`roulette/feature-roulette`** (`/roulette`):
  - the three reels;
  - the Duty Finder settings: duty types, ticked roulettes, PvP and Gold Saucer entries, and level range;
  - **Commence**, and the **Idle animations** switch, which stops the reels scrolling and the crystal floating between spins.
- **`roulette/data-access`:**
  - **`DutiesService`:** the game data from the backend (`/api/duties`, `/api/roulettes`, `/api/jobs`, `/api/frontline`).
  - **`roulette-engine.ts`:** the rules that turn the data into reels, so every result is one the game allows: the duty belongs to the type, and the party settings are possible for it.
  - **`RouletteStore`:** the page's state. It holds the lists and the settings (which mirror the query string), today's Frontline map, and posting a result.

## Settings in the address

The settings are kept in the query string, by id (`settings-query.ts`), so a link or a bookmark brings them along. Plain `/roulette` has nothing ticked.

```
?types=1,3,0&roulettes=r1,r5&pvp=r40,d123&goldSaucer=d7&min=50&max=90
```

`types` are the backend's duty group ids, and `0` is Duty Roulettes. The ticked entries of each type are `r` (a roulette) or `d` (a duty) with its id. The navbar link opens with Dungeons, Trials (Normal) and Raids (Normal) ticked (`?types=1,3,6`, by the backend's duty group ids).

## Posting a result

**Commence** posts only what the reels landed on, as ids (`POST /api/roulette-results`). The backend checks it and builds the "Duty Found" card itself.

- **Members** add a comment, and can share it to the Discord.
- **Guests:** Tataru posts it, with a line of her own.

The card is drawn in the feeds like the game's Duty Found window.

## Without game data

Before the backend's first game data refresh, the page says the list hasn't been downloaded yet. Locally, run the backend's duty refresh once.
