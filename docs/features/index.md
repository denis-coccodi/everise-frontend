---
title: Features
nav_order: 8
has_children: true
---

# Features

How each feature works in the browser. Every page here has a backend twin that covers the API and storage behind it, and the [site guide](/guide/) explains each feature to players.

| Feature                                                     | Frontend libraries                              | Backend page                                                                         |
| ----------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Accounts and sign-in](accounts.md)                         | `auth/*`, `settings/*`, `profile/*`             | [Authentication](/docs/backend/authentication.html)                                  |
| [Posts, comments and media](posts-and-media.md)             | `articles/*`, `media/*`, `home/feature-home`    | [Posts, comments and media](/docs/backend/features/posts-and-media.html)             |
| [Discord, Weekly and Hunts](discord.md)                     | `relays/*`, the share dialogs                   | [Discord, Weekly and Hunts](/docs/backend/features/discord.html)                     |
| [Party Finder](party-finder.md)                             | `party-finder/*`                                | [Party Finder](/docs/backend/features/party-finder.html)                             |
| [Market History](market-history.md)                         | `market/*`                                      | [Market History](/docs/backend/features/market-history.html)                         |
| [Events and Venues](events-and-venues.md)                   | `events/*`, `venues/*`                          | [Events and Venues](/docs/backend/features/events-and-venues.html)                   |
| [The Waking Sands](waking-sands.md)                         | `waking-sands/*`                                | [The Waking Sands](/docs/backend/features/waking-sands.html)                         |
| [Notifications and live updates](notifications-and-live.md) | `notifications/data-access`, `core/http-client` | [Notifications and live updates](/docs/backend/features/notifications-and-live.html) |
| [Duty Roulette and game data](roulette-and-game-data.md)    | `roulette/*`                                    | [Duty Roulette and game data](/docs/backend/features/roulette-and-game-data.html)    |
| [Fight planner](fight-planner.md)                           | `planner/*`                                     | [Fight planner](/docs/backend/features/fight-planner.html)                           |
| [Admin](admin.md)                                           | `settings/feature-settings` (admin windows)     | [Admin](/docs/backend/features/admin.html)                                           |

Each library's own `README.md` lists its files in detail.
