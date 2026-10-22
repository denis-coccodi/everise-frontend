<div align="center">

# ✦ Everise ✦

**The Everise FC community site, themed after Final Fantasy XIV: the free company's feed and Discord news, the Party Finder, community events and venues, a Duty Roulette, market price history and a chat with the game's characters.**

[![Test and deploy staging](https://github.com/denis-coccodi/everise-frontend/actions/workflows/ci-cd.yaml/badge.svg)](https://github.com/denis-coccodi/everise-frontend/actions/workflows/ci-cd.yaml)
![Angular 22](https://img.shields.io/badge/Angular-22-dd0031?logo=angular&logoColor=white)
![Nx 23](https://img.shields.io/badge/Nx-23-143055?logo=nx&logoColor=white)
![NgRx Signals](https://img.shields.io/badge/NgRx-Signal%20Store-ba2bd2)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020?logo=cloudflare&logoColor=white)
![WCAG 2.2 AA](https://img.shields.io/badge/WCAG-2.2%20AA-073a8c)

[**everise.dev**](https://everise.dev) · [Backend](https://github.com/denis-coccodi/everise-backend) · [Architecture](#architecture) · [Accessibility](#accessibility) · [Deployment](#environments-and-deployment)

![The global feed in dark mode: Tataru's post of a guest's roulette result, then a member's](docs/screenshots/feed.png)

| Duty Roulette (light mode)                                                                                                                   | "Duty Found"                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| ![The roulette page: Duty Finder settings and three reels for the duty type, the duty and the party settings](docs/screenshots/roulette.png) | ![The Duty Found window over the roulette, with Commence and Withdraw](docs/screenshots/duty-found.png) |

</div>

## What's inside

- **Feeds** (the home page's **Your Feed** and **Global Feed** tabs, after Weekly and Hunts, each at its own address: `/?view=yours` (members only; a guest gets the Global Feed) and `/?view=global`; posts load only once a feed is opened). A public global feed, "Your Feed" of the people you follow (members only), tag filters and paging. Anyone can read; members post, comment, favourite and follow. A new post goes to the free company's Discord channel only when its author ticks **Also share in the Everise Discord** (offered where the backend has the channel's webhook); a post already up has **Share to Discord** in the feeds and on its page, for its author or an admin (any post), once a minute.
- **Live feed.** New posts appear at the top of the global feed (or a tag's list) the moment they're posted, pushed by the backend over a WebSocket (`/api/live`), with a brief highlight and an announcement for screen readers.
- **Weekly and Hunts** (the home page's first tabs, open to everyone: it opens on **Weekly** at `/`, then **Hunts** at `/?view=hunts`, before the feeds). What the free company's Discord gets from channels it follows, as Discord shows it: text with its Markdown, custom emoji and times in the reader's time zone, bots' cards with their fields, pictures and GIFs (which pause) in the media grid. **Weekly**: when the next daily, Grand Company and weekly resets come; this week's Fashion Report infographic (Kaiyoko's), with the days judging is open, or when it opens again; and the Island Sanctuary workshop recommendations (Overseas Casuals) for the week. **Hunts**: the hunt trains the hunt groups announce, a window per data centre, Light first: those to come ("Starts in 6 minutes"), those running and the last one that started, asked again every minute (`@everise/relays/feature-relays`, `@everise/relays/data-access`).
- **Duty Roulette** (`/roulette`). Three reels pick the duty type, the duty and how you run it (Min IL, Unsynced, Awktrail, everyone on one job…), from the real game data. The page starts with nothing ticked: you pick the duty types (turning on Duty Roulettes, PvP or Gold Saucer ticks their usual entries, all but custom matches). The Duty Finder settings (duty types, ticked roulettes, PvP and Gold Saucer entries, level range) live in the page's query string, only where they differ from the defaults (`/roulette?types=Dungeons,Duty Roulettes&min=50`), so a link or a bookmark brings them along. **Commence** posts the result to the feeds as a duty card: with your comment when you're signed in (and, if you tick **Also share in the Everise Discord**, in the free company's Discord channel too), or by **Tataru** for guests, on the site only: the Waking Sands character herself, with a line the backend's AI writes in her voice about what the guest got, posting as her character profile.
- **The Waking Sands** (`/waking-sands`). A chat with FINAL FANTASY XIV characters, voiced by an AI on the backend (Workers AI): **Tataru**, **Urianger** and **Y'shtola**, and the free company's own **Barnaby Bollocksworth**, a foul-mouthed braggart whose tales of slaying primals don't add up, and **Bernadette "Bernie" Starling**, a cheerful Astrologian (the healer job) who reads anyone's fortune with her star globe and an arcanum from her deck, by the Twelve (each zodiac sign is the god of the month it starts in: Pisces is Menphina's). One room every member shares, live: members bring characters in or send them out for everyone and talk; after each member's line the characters answer as they see fit (at least one, each up to twice, answering each other too). Lines, who's in and who's writing arrive over the live updates' WebSocket (`LiveUpdates.sands$`), and the page reloads the room whenever the socket (re)connects, so nothing is missed. The room keeps the last day; guests can watch. Each character's name leads to their **profile** (`/profile/character:<id>`), like a member's: their picture, a bio in their own voice and their posts (Tataru's: guests' roulette results), with a note that they're an AI-voiced character; nobody can follow them, and only admins change them. The backend keeps each member and the site within a daily budget.
- **Party Finder** (`/party-finder`, open to everyone; everything it shows is in its query string, by id: `?dc=light&world=odin&category=high-end-duty-savage&slot=healer&search=…&sort=ending-soon&no-duty=show&beginners=only&page=2`, so any view can be linked). The Party Finder listings up in the game on any data centre (picked by region, Europe first; **Light** from **Odin** when arriving at the page, **Chaos** next; picking a data centre, Light too, shows all its worlds), as [xivpf.com](https://xivpf.com/listings) collects them from players' Remote Party Finder plugin: in the game's order (by Party Finder tab, high-end duty savage first, then ultimates, then extremes, then the highest level duty first, the newest among duties of one level, one duty's listings by time left) or by time left, last seen, players needed, item level or name, 20 a page, tiles laid out like the game's: the duty type's icon and the duty (treasure maps, deep dungeons and roulettes named right, where xivpf's API mixes them up), the sprout when beginners are welcome, the conditions in brackets, the description, where the party is, item level and players still needed, and the slots as the game's job and role icons, an open slot's accepted jobs in a tooltip; time left. Filter by world (what you can join from it: the whole data centre plus that world's own Hunt and FATE parties, explained in a tooltip), category, an open slot for your role and words to find; listings without a duty are hidden unless switched on. The page asks again every 30 seconds while it's in view (the backend reads xivpf at most once a minute); nothing is kept in the browser, and a refresh keeps your place in the list and the page you're on. Signed-in members can **Share as post** (the listing as it is then, with their message, shown in the feeds with the same card; optionally in the Discord too) or **Share to Discord** (the listing with their message, in the free company's channel only). Anything going to Discord takes a picture of the listing's card along, drawn in the member's browser (`html-to-image`) and uploaded with it. Links from the Discord carry `?from=discord`: whoever opens one signed out is asked to sign in first (`discordLinkGuard`), then brought back; a Discord-only share opens its data centre's page with the listing pinned under **Shared with you** while it's up.
- **Events** (`/events`, open to everyone; `?dc=chaos` for one data centre, `?search=` to find by words). The community's FFXIV events this week (club nights, parties, races, gatherings) as [Partake](https://www.partake.gg) lists them, only those rated at most MATURE (labelled "Mature"; the backend never sends ADULT ones): those on now first, then the rest under the day they start, asked again every 5 minutes. Each has its own page (`/events/<id>`): the organisers' description, when and where in the visitor's time, who hosts it, the venue it's held at when the backend is sure of it, and for members **Share to Discord** until it ends. Event pages are kept out of search engines: Partake is their home (`@everise/events/feature-events`, `@everise/events/event-card`).
- **Venues** (`/venues`, open to everyone; Light by default, `?dc=` for another, `?search=`). The community's player-run venues (taverns, cafés, clubs…) as [FFXIV Venues](https://ffxivvenues.com) lists them, only the safe-for-work ones its team approved: those open now first, then the rest of the week. A venue's page (`/venues/<id>`) has its whole description, its regular openings in the visitor's time, its links, the week's Partake events held there, and **Share to Discord** for members (`@everise/venues/feature-venues`).
- **Market History** (`/market-history`, for members; guests see what it does and a way to sign up). One item's median sale price over time on every world of a region (and Oceania's, when asked), a line per world, from the sales players report to [Universalis](https://universalis.app); above the chart, the cheapest listing now and the lowest prices today and in the days shown. The item, region, quality, days and worlds are all in the address, so a link shows anyone the same chart (`@everise/market/feature-market`).
- **Found by search engines.** The pages people search for (home, Party Finder and each data centre's page, roulette, Waking Sands, posts) get their own title, description, canonical address, link-preview card and [schema.org](https://schema.org) data from the Worker ([Search engines](#search-engines)), and `robots.txt` and `sitemap.xml` list what to crawl.
- **Notifications** (the bell in the header, for members, as Facebook has it). Who liked (favorited) or commented on your posts, grouped per post ("Alisaie, Alphinaud and 3 others liked your post …", a comment's opening words under it), and who started following you; each names the members and the post, linked to their profiles and the post. The site's own news shows its crest: a Party Finder listing you shared is no longer up (linked to its data centre's listings, or to the post you shared it as; the Discord hears too when it was shared there), and an admin changed your role. The badge counts what you haven't seen, asked for every minute while the tab is shown and when you come back to it; opening the list makes them seen, and each stays highlighted until you open it or **Mark all as read**. The panel closes on following a link, Escape or a click outside (`NotificationsStore` in `@everise/notifications/data-access`).
- **Profiles and settings.** Profile pictures picked in the browser, cropped to a square and shrunk to the backend's limits before uploading; bio, email, password; an account menu in the header.
- **Roles.** Everyone registers as a user. Admins (set on the backend) get two more windows in Settings: **Waking Sands characters**, a tab per character with its picture, title, profile bio and personality (the description the AI plays it from, which can go back to the original) (Tataru's picture and title also show on the roulette results she posts for guests), and **Members and roles**, where a member can be made a **staging tester**, which lets them open the staging site (the backend updates its Cloudflare Access list).
- **Final Fantasy XIV look.** Crystal motifs, deep-blue windows, Cinzel headings, in a dark mode (default) and a "Final Fantasy white" light mode. Members' choice is saved with their settings, so it follows them to every browser.
- **Accessible:** built to WCAG 2.2 AA ([Accessibility](#accessibility)).

Game data and images come from the backend, which caches them from [XIVAPI](https://v2.xivapi.com). FINAL FANTASY XIV © SQUARE ENIX CO., LTD. Game images are used under Square Enix's fan site materials licence.

## Tech stack

| Part      | Choice                                                                                                                                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework | [Angular 22](https://angular.dev): standalone components, signals, zoneless change detection, control flow blocks                                                                                                                            |
| Workspace | [Nx 23](https://nx.dev) monorepo: one app, libraries by domain and layer                                                                                                                                                                     |
| State     | [NgRx Signal Store](https://ngrx.io/guide/signals)                                                                                                                                                                                           |
| API types | Generated from the backend's OpenAPI document with [openapi-typescript](https://openapi-ts.dev) ([below](#api-types)); a CI job fails on drift                                                                                               |
| Language  | [TypeScript 6](https://www.typescriptlang.org/), strict templates, no `any` outside specs                                                                                                                                                    |
| Tests     | [Vitest](https://vitest.dev) unit tests in every project; `scripts/smoke.sh` against each deploy                                                                                                                                             |
| Hosting   | [Cloudflare Workers](https://developers.cloudflare.com/workers/) static assets, with `/api` forwarded to the backend Worker over a service binding                                                                                           |
| Backend   | [everise-backend](https://github.com/denis-coccodi/everise-backend): Express 5 and zod on Cloudflare Workers, its data in SQL tables (SQLite in a Durable Object), R2 for images, Workers AI ([API docs](https://apis.everise.dev/api/docs)) |

## Getting started

You need [Node.js](https://nodejs.org) 22 and npm, and the [backend](https://github.com/denis-coccodi/everise-backend) checked out next to this repository.

1. In the backend: `npm install`, create its `.dev.vars` (see its README), then `npx wrangler dev --port 8080`.
1. Here: `npm install`, then `npm start`. Open http://localhost:4200.

The local build calls the backend directly at `http://localhost:8080/api` ([`environment.ts`](apps/everise/src/environments/environment.ts)). To use the staging backend instead, see [Environments and deployment](#environments-and-deployment).

The Duty Roulette needs game data: run the backend's duty refresh once (its README explains how), or the page says the list hasn't been downloaded yet.

| Command                                                                 | What it does                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm start`                                                             | Dev server on port 4200                                                              |
| `npx nx run-many -t lint test`                                          | Lint and unit-test every project                                                     |
| `npx nx run everise:build --configuration=production`                   | Production build in `dist/apps/everise` (`staging` for the staging build)            |
| `npm run start-worker`                                                  | Build, then serve with `wrangler dev`, as deployed (the Worker's SEO pages)          |
| `npx nx graph`                                                          | The live project graph                                                               |
| `npm run api-types`                                                     | Regenerate the API types from the backend's `openapi.json` ([API types](#api-types)) |
| `node scripts/check-sizes.mjs`                                          | Check every file is within its size limit ([Code conventions](#code-conventions))    |
| `node scripts/check-structure.mjs`                                      | Check every file is in the right folder ([Code conventions](#code-conventions))      |
| `node scripts/check-mobile-first.mjs`                                   | Check styles are written for phones first ([Code conventions](#code-conventions))    |
| `node tools/diagrams/frontend-structure.js docs/frontend-structure.svg` | Regenerate a diagram (or `website-structure.js`; [below](#website-structure))        |
| `node tools/crest/update-crest.mjs`                                     | Redraw the crest and `favicon.ico` from the free company's Lodestone page            |

Before pushing, `node scripts/check-sizes.mjs && node scripts/check-structure.mjs && node scripts/check-mobile-first.mjs && npx nx run-many -t lint test && npx tsc -p worker/tsconfig.json && npx vitest run --config worker/vitest.config.mts && npx nx run everise:build --configuration=production && npx nx run everise:build --configuration=staging` must pass: it's the same as the required `test` check. Every change goes through a `bugfix/`, `hotfix/` or `feature/` branch and a pull request to `main` (the `feature-branch` skill).

## Architecture

### Frontend structure

![Everise frontend: Nx apps and libraries by layer, with their dependencies](docs/frontend-structure.svg)

One Angular app (`apps/everise`) is a thin shell: routes, guard, page titles, HTTP setup and layout. Everything else lives in libraries under `libs/`, grouped by domain (`articles`, `auth`, `events`, `home`, `market`, `media`, `notifications`, `party-finder`, `profile`, `relays`, `roulette`, `settings`, `venues`, `waking-sands`, plus `core` and `ui`) and layered:

- **feature** libs: a page or a few related pages, lazy-loaded by the router;
- **widget** libs: feature pieces several pages show, so no page imports another: the feed list (`articles/feature-articles-list`, on Home and Profile), the Weekly and Hunts tabs (`relays/feature-relays`), the event card (`events/feature-event-card`, on the Events page and a venue's page), the Party Finder listing card (`party-finder/feature-pf-listing`, in the Party Finder and in posts) and post media (`media/feature-media`);
- **data-access** libs: NgRx signal stores, API services, guards and resolvers. A load whose loading or error a page shows is an Angular resource, which the page reads directly (`hasValue()`, `isLoading()`, `error()`);
- **core** and **ui** libs: API types, HTTP client (with `LiveUpdates`, the live updates WebSocket), form errors and error handling; the **ui** lib also holds the theme and the themed building blocks every page uses ([Theme](#theme)). They have no dependencies on other libs.

Dependencies point down a layer (a page may use any domain's widgets and data-access, as the articles page shows Party Finder cards), never up and never from one page to another; lint enforces it.

### API types

The shapes the app sends and receives aren't written by hand. The backend describes its API as OpenAPI 3.1 (browse it at [apis.everise.dev/api/docs](https://apis.everise.dev/api/docs)) and commits the document; `npm run api-types` turns it into `libs/core/api-types/src/lib/generated/openapi.ts` with [openapi-typescript](https://openapi-ts.dev), and the library names its schemas (`export type Article = Schemas['Article']`). Requests use their own types (`UserChanges`, `CreateArticle`), never a cast, and limits the forms enforce come from the API's answers. CI's `api-types` job regenerates them from the backend's `main` and fails when the committed file differs, so the two sides can't drift apart. Only the live updates' events, which OpenAPI can't describe, are typed by hand.

### Website structure

![Everise website: pages, what they show, where they lead, and site-wide rules](docs/website-structure.svg)

Both images are generated, and refuse to generate when they'd leave something out. `frontend-structure.js` reads the Nx project graph and each data-access library's exports; a new project needs a line in its `PROJECTS`. `website-structure.js` reads the routes from `app.routes.ts` and each feature library's `<feature>.routes.ts` it loads, and the navbar's groups from `nav-groups.ts`; a new route needs a card in its `SECTIONS`. They share their colours (`tools/diagrams/colours.js`), one per domain. Run `node tools/diagrams/frontend-structure.js docs/frontend-structure.svg` (or `website-structure.js docs/website-structure.svg`) after changing either, then refresh the PNG copy with a headless browser at the size the script prints, e.g. `msedge --headless=new --hide-scrollbars --window-size=1560,2635 --screenshot=docs/frontend-structure.png docs/frontend-structure.svg`.

### Theme

The site looks like Final Fantasy / FFXIV: crystal motifs, deep-blue windows, silver-white trim and Cinzel headings. It has two modes:

- **dark (default):** near-black navy backdrop with crystal-teal highlights;
- **light:** Final Fantasy white, with royal-blue highlights. Turn Settings → Appearance → Dark mode off and save to switch to it. The choice is saved with the account (`darkMode` on the backend's user) and copied to this browser, so pages start in the right mode; guests' choice stays in the browser.

**Only the theme is global.** The UI library ([`libs/ui/components`](libs/ui/components), imported as `@everise/ui/components`) defines it in [`src/theme`](libs/ui/components/src/theme), and [`apps/everise/src/styles.scss`](apps/everise/src/styles.scss) only loads it:

- **tokens:** the palette (used only inside the theme) and the role tokens everything uses, such as `--color-base`, `--color-surface`, `--color-contrast`, `--color-heading`, `--color-primary`, `--color-crystal`, `--color-focus`, `--font-display`, `--radius-*`, `--shadow-*` and `--gradient-*`. The light mode re-points them;
- **the reset and element typography;**
- **the layout grid** (`.container`, `.row`, `.col-*`);
- **text helpers:** `.xiv-title`, `.xiv-label`, `.xiv-heading`, `.logo-font`, `.visually-hidden`, and `.xiv-prose` for the rendered article body, which component styles can't reach.

**Every component styles itself**, in its own `.scss` next to its `.ts`, scoped by Angular and using the role tokens. That includes pages, the navbar, the footer and the app shell.

**The UI library provides the dumb, themed building blocks** every page uses. Each sits in its own folder with its `.ts`, `.scss` and `.spec.ts`:

| Building block          | For                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `cdtButton`             | buttons and button links                                                                  |
| `cdtInput`              | text fields and text areas (marks invalid fields with `aria-invalid`)                     |
| `<cdt-field>`           | a form field with its visible label and its errors                                        |
| `<cdt-checkbox>`        | a checkbox with its label                                                                 |
| `<cdt-switch>`          | an on/off switch for a setting that applies at once (dark mode)                           |
| `<cdt-tooltip>`         | a note on hover or keyboard focus (Escape hides it), read as a description                |
| `<cdt-turnstile>`       | Cloudflare Turnstile, the bot check on sign-up, sign-in and resending a confirmation link |
| `<cdt-panel>`           | a window                                                                                  |
| `<cdt-card>`            | a card with an optional footer                                                            |
| `<cdt-banner>`          | a page's title strip                                                                      |
| `<cdt-dialog>`          | a modal window that keeps the keyboard focus inside and gives it back                     |
| `<cdt-duty-card>`       | a roulette result, like the "Duty Found" window                                           |
| `<cdt-image-cropper>`   | choosing a square area of a picture                                                       |
| `<cdt-menu>`            | a button that opens a menu (the account menu), with `cdtMenuItem` entries                 |
| `<cdt-byline>`          | an avatar, author name and date                                                           |
| `cdtTabs` / `cdtTab`    | tab bars: links for pages, buttons for views                                              |
| `cdtTag`                | tag pills                                                                                 |
| `<cdt-pager>`           | pagination                                                                                |
| `<cdt-icon>`            | every icon the site draws, as inline SVG                                                  |
| `<cdt-avatar>`          | a round profile picture, with the default one for someone without                         |
| `<cdt-message>`         | a status, warning or error line, read out by screen readers                               |
| `<cdt-show-password>`   | shows or hides the password typed in a field                                              |
| `<cdt-line-chart>`      | a time series chart (the market's prices)                                                 |
| `<cdt-community-links>` | where else to find Everise (the Discord invite)                                           |

The ones on native elements (`cdtButton`, `cdtInput`, `cdtTabs`, `cdtTab`, `cdtTag`, `cdtMenuItem`) are components with attribute selectors, as in Angular Material. That keeps native semantics and forms while letting them carry their own styles.

Feature libraries reuse the building blocks and don't define colours, fonts, shadows or control styles of their own. The rules, and check commands, are in [`.claude/skills/theme/SKILL.md`](.claude/skills/theme/SKILL.md).

## Code conventions

How work is done here is written down for people and AI assistants alike, as skills in [`.claude/skills`](.claude/skills). Each `SKILL.md` says what it covers and when to use it; longer reference material and scripts sit next to it:

| Skill                     | For                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `feature-branch`          | Every change: a `bugfix/`, `hotfix/` or `feature/` branch, Conventional Commits, a pull request, merging once `test` passes; line-ending traps |
| `trunk-based`             | Trunk-based development: feature flags (`features`), releasing a feature, `prod-*` tags, hotfixing production                                  |
| `frontend-best-practices` | Code and structure: libraries, components, stores, types, specs, size limits                                                                   |
| `theme`                   | Looks: tokens, the UI building blocks (`building-blocks.md`), where styles live (`scripts/check-theme.sh`)                                     |
| `mobile-first`            | Styles written for phones first, wider screens from a width up                                                                                 |
| `accessibility`           | WCAG 2.2 AA rules and checks (`scripts/axe-check.mjs`)                                                                                         |
| `ui-check`                | A page in a real browser against a local backend: screenshots, reflow, axe (`scripts/ui-check.mjs`)                                            |
| `deploy`                  | Staging and production, failing pipelines (`troubleshooting.md`)                                                                               |
| `smoke-test`              | The deployed shell and its `/api` wiring                                                                                                       |

The code rules, in short:

- **Libraries by type, enforced by lint.** Every project is tagged (app, feature, widget, data-access, ui, util, testing) and `@nx/enforce-module-boundaries` fails an import that breaks the layering. A page never imports another page; what two pages share becomes a widget, a data-access library or a UI building block.
- **One component per folder, named after it** (`settings/settings.component.ts`), pages included; directives and pipes likewise. Stores and API services live only in data-access libraries, never next to a component, and folders are named after what they hold, not by kind of file (no `components/`, `services/`, `models/`). Libraries are imported by their `@everise/…` entry point only, never by a path into their `src/`. Each library's routes are in its `<feature>.routes.ts`, which `app.routes.ts` loads, and exported types are in `<name>.model.ts` files named after what owns them (`tags.model.ts`, `button.model.ts`). `scripts/check-structure.mjs` (part of the `test` check) enforces it.
- **State in NgRx signal stores**, components with signals and `OnPush`, typed templates. A load whose status a page shows is a resource the page reads directly; other calls are `rxMethod`. Forms are signal forms only. NgRx's own lint rules (`signals`, `operators`) are on.
- **No `any`** outside specs, and no `$any()` in templates (both fail lint). API shapes come only from the generated types ([API types](#api-types)).
- **Errors** are shown with the backend's own message (`serverMessage()`), in the shared message component.
- **Size limits** (`scripts/check-sizes.mjs`, first step of the `test` check): component classes 200 lines, templates 150, styles 250, stores and services 250, other TypeScript 350. A file that grows past them is split, never exempted; generated code is skipped.
- **Specs** next to the code in every project, with a shared test setup (`@everise/core/testing`).

## Accessibility

The site aims at **WCAG 2.2 level AA**, in both colour modes.

- **Structure:** a "Skip to main content" link first, one `<main>` per page, a named navigation landmark, one `<h1>` per page and headings in order. Every page has its own title ("Sign in · Everise", the article's title on an article).
- **Keyboard:** everything works without a mouse. Links are real links and actions are real buttons (tabs, tags, the pager, deleting a comment). After a page change the focus moves to the new content. Dialogs keep the focus inside and return it when they close; the account menu and the picture cropper have their own keys.
- **Forms:** visible labels on every field, required fields marked, `autocomplete` on sign-in and sign-up fields, `aria-invalid` on invalid fields, and error messages that screen readers announce.
- **Screen readers:** icons are hidden from them, icon-only buttons have names ("Favorite, 7 favorites", with `aria-pressed`), the current tab and page are `aria-current`, and status messages (loading, the roulette's result, form errors) are live regions.
- **Colour and contrast:** text is at least 4.5:1 and field outlines and the focus ring at least 3:1 against their background, checked for every role token in both modes.
- **Motion:** animations respect `prefers-reduced-motion`, and the roulette has an **Idle animations** switch, which stops the reels scrolling and the crystal floating between spins.
- **Zoom and small screens:** pages reflow down to 320 px wide without sideways scrolling, and dialogs scroll inside when the screen is short.

**Checking a change.** Run [axe](https://github.com/dequelabs/axe-core) (the browser extension, or `@axe-core/playwright`) on the pages you touched, signed in and out, in both modes; tab through them with the keyboard; and look at them at 320 px wide. The `theme` skill's rules keep colours on role tokens, whose contrast is already checked.

## Environments and deployment

The app runs on Cloudflare Workers. The deployed builds call the relative `/api`: a small Worker script ([worker/index.ts](worker/index.ts)) forwards `/api/*` to the [backend](https://github.com/denis-coccodi/everise-backend) Worker of the same environment over a [service binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/), and every other path is a static file (with `index.html` for unknown paths). The browser only ever talks to one site, so there is no CORS, the backend's cookies are first-party, and staging needs a single Cloudflare Access login.

```
Browser ──> prod / staging  ├─ static files (Angular build)
                             └─ /api/* ──service binding──> be-prod / be-staging backend
```

| Environment | URL                         | Environment file                                                               | API                                                 | Deployed by                                                                               |
| ----------- | --------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| local       | http://localhost:4200       | [environment.ts](apps/everise/src/environments/environment.ts)                 | http://localhost:8080/api (direct, CORS)            | `npm start`                                                                               |
| staging     | https://staging.everise.dev | [environment.staging.ts](apps/everise/src/environments/environment.staging.ts) | `/api` → `be-staging` (binding in `wrangler.jsonc`) | every merge to `main` ([Test and deploy staging](.github/workflows/ci-cd.yaml))           |
| production  | https://everise.dev         | [environment.prod.ts](apps/everise/src/environments/environment.prod.ts)       | `/api` → `be-prod` (binding in `wrangler.jsonc`)    | by hand: Actions → Deploy production → Run workflow, only for commits that passed staging |

Each Worker's custom domain is declared under `routes` in `wrangler.jsonc` (`everise.dev`, `staging.everise.dev`); the backends answer at `apis.everise.dev` and `staging.apis.everise.dev`. The old `workers.dev` addresses (`prod.everisefc.workers.dev`, `staging.everisefc.workers.dev`) stay on, so links saved before the move keep working.

Staging is behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/): only allowed people can open it, after logging in once. CI gets through with an Access service token (`CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` repository secrets).

The bot check ([Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)) on sign-up, sign-in and resending a confirmation link uses `turnstileSiteKey` from the environment: the Everise widget's site key on staging and production (public; the backend holds the secret, `TURNSTILE_SECRET_KEY`), and locally Cloudflare's test key, which always passes and shows "For testing only". The forms wait for the widget's pass, send it as `turnstileToken`, and ask for a new one after each try (a pass works once). An empty key turns the check off.

Dependabot ([.github/dependabot.yml](.github/dependabot.yml)) opens pull requests every Monday that update the npm packages and the GitHub Actions: one for Angular, Nx and NgRx's minor and patch updates, one for every other minor and patch update, one per other major. Angular, Nx and NgRx majors go through `npx nx migrate latest` instead. The PRs come from `dependabot/…` branches, the one exception to the branch names, and are merged like any other once **test** passes.

### Branches and releases

The repo follows **trunk-based development**: there is one long-lived branch, `main`, and it must always be fine to deploy to production. Branches are short-lived (a day or two) and merge straight into `main` through a pull request; there is no `develop` branch and there are no release branches.

A feature that takes more than one pull request merges each of them **switched off in production** behind a feature flag, so a fix never waits behind unfinished work. Each environment file has `features`, one `true`/`false` per feature still being built: `true` locally and on staging, `false` in `environment.prod.ts` until it's released. Only the app shell reads them, to leave out the feature's routes and navbar links. The backend has the same flags (`FEATURES`). Today the fight planner is behind `planner`.

To release a feature, set it to `true` in `environment.prod.ts` (and in the backend's production `FEATURES`) and deploy production; once it has settled, remove the flag.

Each **Deploy production** run tags the commit it deployed `prod-YYYY-MM-DD-HHMM`, so the latest `prod-*` tag is always what production runs. A fix for production is normally a `hotfix/` branch merged into `main` and deployed like any change; only if `main` holds something that can't go to production yet does the hotfix start from the latest `prod-*` tag and get deployed by hand. Details in the `trunk-based` skill.

### Search engines

The Worker also writes what search engines and link previews read, since the app only fills a page in after it runs (`worker/seo`, run for the paths in `assets.run_worker_first`):

- **Each page's `<head>`:** its title, description, canonical address (`SITE_URL` + the page's path, whatever host it was opened on), Open Graph and Twitter card tags, and schema.org JSON-LD: the free company (`Organization`, `WebSite`) on the home page, breadcrumbs on the Party Finder pages, `Article` on posts. Sign-in and sign-up are `noindex`.
- **The page's words in `<cdt-root>`**, which the app replaces as soon as it starts: the same heading and introduction people see, the duties recruiting on that data centre right now (counts only, never who), and links to every data centre's page. The Party Finder is read through the backend (cached there for a minute); if it takes over 1.5 seconds the page is sent without it.
- **`robots.txt` and `sitemap.xml`:** the sitemap lists the fixed pages, each data centre's Party Finder page and the newest 5,000 posts (`GET /api/sitemap` on the backend).
- Only production (`SEARCH_ENGINES: "allow"` in `wrangler.jsonc`) may be indexed: staging's `robots.txt` disallows everything and its pages carry `X-Robots-Tag: noindex` (it is behind Cloudflare Access too).
- The SEO pieces are pure functions with their own tests: `npx tsc -p worker/tsconfig.json` and `npx vitest run --config worker/vitest.config.mts` (both in CI).

Local development: start the backend (`npx wrangler dev --port 8080` in the backend repo), then `npm start`; the dev build calls it directly. To develop against the staging backend, set `api_url` in `environment.ts` to its URL (there as a comment) and first open that URL in the browser to log in to Cloudflare Access; its CORS allows `localhost:4200`. `npm run start-worker` builds the app and serves the built files with `wrangler dev`. The site has no service worker.
