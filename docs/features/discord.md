---
title: Discord, Weekly and Hunts
parent: Features
nav_order: 3
---

# Discord, Weekly and Hunts

Backend: [Discord, Weekly and Hunts](/docs/backend/features/discord.html).

## Weekly and Hunts tabs (`relays/*`)

- **`relays/feature-relays`** (a widget on the home page):
  - **`cdt-weekly`:** the next resets, this week's Fashion Report with the days it's for (or when judging opens again), and the Island Sanctuary recommendations.
  - **`cdt-hunts`:** the hunt trains to come, running and last started, a window per data centre, Light first.
- **`cdt-discord-message`:** shows one relayed message as Discord does.
  - Its text is Discord Markdown, read by `discord-markdown.ts` into nodes the template renders, **never HTML**.
  - Custom emoji come from Discord's CDN, and times show in the reader's time zone.
  - Cards are drawn by `cdt-discord-embed`, and pictures go in the media grid (GIFs pause).
  - Pictures whose Discord links would expire are served by the backend (`relay-pictures.ts`).
- **`relays/data-access`:**
  - `WeeklyStore` asks again every 10 minutes, and moves the countdowns every 30 seconds.
  - `HuntsStore` asks every minute while the tab is in view.

## Sharing to Discord

Each shareable thing has its own share dialog, offered only where `GET /api/discord/sharing` says the backend has the webhook:

| What                   | Where                        | Store                                                    |
| ---------------------- | ---------------------------- | -------------------------------------------------------- |
| A post                 | the feed and the post's page | `share-post-discord` in `articles/feature-articles-list` |
| A roulette result      | **Commence**, members only   | `RouletteStore`                                          |
| A Party Finder listing | the listing's card           | `PfShareStore`                                           |
| An event, a venue      | their own pages              | `EventShareStore`, `VenueShareStore`                     |

The backend's rate limits come back as messages with `Retry-After`, which the dialogs show.

## Discord widget

Members see who's online on the free company's server in the home page's sidebar (`GET /api/discord/widget`). Links to join it are in the home page's banner and the footer (`<cdt-community-links>`).
