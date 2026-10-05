<div align="center">

# ✦ Everise ✦

**The Everise FC community site: a Final Fantasy XIV–themed feed, profiles and a Duty Roulette that posts your next run.**

[![CI/CD](https://github.com/denis-coccodi/everise-frontend/actions/workflows/ci-cd.yaml/badge.svg)](https://github.com/denis-coccodi/everise-frontend/actions/workflows/ci-cd.yaml)
![Angular 22](https://img.shields.io/badge/Angular-22-dd0031?logo=angular&logoColor=white)
![Nx 23](https://img.shields.io/badge/Nx-23-143055?logo=nx&logoColor=white)
![NgRx Signals](https://img.shields.io/badge/NgRx-Signal%20Store-ba2bd2)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020?logo=cloudflare&logoColor=white)
![WCAG 2.2 AA](https://img.shields.io/badge/WCAG-2.2%20AA-073a8c)

[**prod.everisefc.workers.dev**](https://prod.everisefc.workers.dev) · [Backend](https://github.com/denis-coccodi/everise-backend) · [Architecture](#architecture) · [Accessibility](#accessibility) · [Deployment](#environments-and-deployment)

![The global feed in dark mode: Tataru's post of a guest's roulette result, then a member's](docs/screenshots/feed.png)

| Duty Roulette (light mode)                                                                                                                   | "Duty Found"                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| ![The roulette page: Duty Finder settings and three reels for the duty type, the duty and the party settings](docs/screenshots/roulette.png) | ![The Duty Found window over the roulette, with Commence and Withdraw](docs/screenshots/duty-found.png) |

</div>

## What's inside

- **Feeds.** A public global feed, "Your Feed" of the people you follow, tag filters and paging. Anyone can read; members post, comment, favourite and follow.
- **Live feed.** New posts appear at the top of the global feed (or a tag's list) the moment they're posted, pushed by the backend over a WebSocket (`/api/live`), with a brief highlight and an announcement for screen readers.
- **Duty Roulette** (`/roulette`). Three reels pick the duty type, the duty and how you run it (Min IL, Unsynced, Awktrail, everyone on one job…), from the real game data. **Commence** posts the result to the feeds as a duty card: with your comment when you're signed in, or by **Tataru** for guests.
- **Profiles and settings.** Profile pictures picked in the browser, cropped to a square and shrunk to the backend's limits before uploading; bio, email, password; an account menu in the header.
- **Roles.** Everyone registers as a user. Admins (set on the backend) get two more windows in Settings: **Tataru**, the account that posts guests' roulette results (her picture and bio; nobody can sign in as her), and **Members and roles**, where a member can be made a **staging tester**, which lets them open the staging site (the backend updates its Cloudflare Access list).
- **Final Fantasy XIV look.** Crystal motifs, deep-blue windows, Cinzel headings, in a dark mode (default) and a "Final Fantasy white" light mode. Members' choice is saved with their settings, so it follows them to every browser.
- **Works offline** on the deployed sites: the feed is cached, and favourites made offline are synced when you're back.
- **Accessible:** built to WCAG 2.2 AA ([Accessibility](#accessibility)).

Game data and images come from the backend, which caches them from [XIVAPI](https://v2.xivapi.com). FINAL FANTASY XIV © SQUARE ENIX CO., LTD. Game images are used under Square Enix's fan site materials licence.

## Tech stack

| Part      | Choice                                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework | [Angular 22](https://angular.dev): standalone components, signals, zoneless change detection, control flow blocks                                  |
| Workspace | [Nx 23](https://nx.dev) monorepo: one app, libraries by domain and layer                                                                           |
| State     | [NgRx Signal Store](https://ngrx.io/guide/signals)                                                                                                 |
| Tests     | [Vitest](https://vitest.dev) unit tests in every project; [Playwright](https://playwright.dev) end-to-end tests (`apps/everise-e2e`)               |
| Hosting   | [Cloudflare Workers](https://developers.cloudflare.com/workers/) static assets, with `/api` forwarded to the backend Worker over a service binding |
| Backend   | [everise-backend](https://github.com/denis-coccodi/everise-backend): Express on Cloudflare Workers, a Durable Object as the database               |

## Getting started

You need [Node.js](https://nodejs.org) 22 and npm, and the [backend](https://github.com/denis-coccodi/everise-backend) checked out next to this repository.

1. In the backend: `npm install`, create its `.dev.vars` (see its README), then `npx wrangler dev --port 8080`.
1. Here: `npm install`, then `npm start`. Open http://localhost:4200.

The local build calls the backend directly at `http://localhost:8080/api` ([`environment.ts`](apps/everise/src/environments/environment.ts)). To use the staging backend instead, see [Environments and deployment](#environments-and-deployment).

The Duty Roulette needs game data: run the backend's duty refresh once (its README explains how), or the page says the list hasn't been downloaded yet.

| Command                                                                 | What it does                                                                        |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm start`                                                             | Dev server on port 4200                                                             |
| `npx nx run-many -t lint test`                                          | Lint and unit-test every project                                                    |
| `npx nx run everise:build --configuration=production`                   | Production build in `dist/apps/everise` (`staging` for the staging build)           |
| `npm run e2e`                                                           | Playwright end-to-end tests                                                         |
| `npm run start-sw`                                                      | Build, then serve with `wrangler dev`, as deployed (try the service worker locally) |
| `npx nx graph`                                                          | The live project graph                                                              |
| `node tools/diagrams/frontend-structure.js docs/frontend-structure.svg` | Regenerate a diagram ([below](#architecture))                                       |

Before pushing, `npx nx run-many -t lint test && npx nx run everise:build --configuration=production && npx nx run everise:build --configuration=staging` must pass: it's the same as the required `test` check. Every change goes through a `feature/<name>` branch and a pull request to `main`.

## Architecture

### Frontend structure

![Everise frontend: Nx apps and libraries by layer, with their dependencies](docs/frontend-structure.svg)

One Angular app (`apps/everise`) is a thin shell: routes, guard, page titles, HTTP setup and layout. Everything else lives in libraries under `libs/`, grouped by domain (`auth`, `articles`, `home`, `profile`, `roulette`, `settings`) and layered:

- **feature** libs: one per page, lazy-loaded by the router (`feature-articles-list` is the exception: a shared list used by Home and Profile);
- **data-access** libs: NgRx signal stores, API services, guards and resolvers;
- **core** and **ui** libs: API types, HTTP client (with `LiveUpdates`, the live updates WebSocket), form errors and error handling; the **ui** lib also holds the theme and the themed building blocks every page uses ([Theme](#theme)). They have no dependencies on other libs.

Dependencies only point down a layer or sideways within a domain.

### Website structure

![Everise website: pages, what they show, where they lead, and site-wide rules](docs/website-structure.svg)

Both images are generated: run `node tools/diagrams/frontend-structure.js docs/frontend-structure.svg` (or `website-structure.js`) after changing the structure, then refresh the PNG copy with a headless browser, e.g. `msedge --headless=new --hide-scrollbars --window-size=1760,1000 --screenshot=docs/frontend-structure.png docs/frontend-structure.svg` (`1560,1236` for the website image).

### Theme

The site looks like Final Fantasy / FFXIV: crystal motifs, deep-blue windows, silver-white trim and Cinzel headings. It has two modes:

- **dark (default):** near-black navy backdrop with crystal-teal highlights;
- **light:** Final Fantasy white, with royal-blue highlights. Turn Settings → Appearance → Dark mode off and save to switch to it. The choice is saved with the account (`darkMode` on the backend's user) and copied to this browser, so pages start in the right mode; guests' choice stays in the browser.

**Only the theme is global.** The UI library ([`libs/ui/components`](libs/ui/components), imported as `@realworld/ui/components`) defines it in [`src/theme`](libs/ui/components/src/theme), and [`apps/everise/src/styles.scss`](apps/everise/src/styles.scss) only loads it:

- **tokens:** the palette (used only inside the theme) and the role tokens everything uses, such as `--color-base`, `--color-surface`, `--color-contrast`, `--color-heading`, `--color-primary`, `--color-crystal`, `--color-focus`, `--font-display`, `--radius-*`, `--shadow-*` and `--gradient-*`. The light mode re-points them;
- **the reset and element typography;**
- **the layout grid** (`.container`, `.row`, `.col-*`);
- **text helpers:** `.xiv-title`, `.xiv-label`, `.xiv-heading`, `.logo-font`, `.visually-hidden`, and `.xiv-prose` for the rendered article body, which component styles can't reach.

**Every component styles itself**, in its own `.scss` next to its `.ts`, scoped by Angular and using the role tokens. That includes pages, the navbar, the footer and the app shell.

**The UI library provides the dumb, themed building blocks** every page uses. Each sits in its own folder with its `.ts`, `.scss` and `.spec.ts`:

| Building block        | For                                                                       |
| --------------------- | ------------------------------------------------------------------------- |
| `cdtButton`           | buttons and button links                                                  |
| `cdtInput`            | text fields and text areas (marks invalid fields with `aria-invalid`)     |
| `<cdt-field>`         | a form field with its visible label and its errors                        |
| `<cdt-checkbox>`      | a checkbox with its label                                                 |
| `<cdt-panel>`         | a window                                                                  |
| `<cdt-card>`          | a card with an optional footer                                            |
| `<cdt-banner>`        | a page's title strip                                                      |
| `<cdt-dialog>`        | a modal window that keeps the keyboard focus inside and gives it back     |
| `<cdt-duty-card>`     | a roulette result, like the "Duty Found" window                           |
| `<cdt-image-cropper>` | choosing a square area of a picture                                       |
| `<cdt-menu>`          | a button that opens a menu (the account menu), with `cdtMenuItem` entries |
| `<cdt-byline>`        | an avatar, author name and date                                           |
| `cdtTabs` / `cdtTab`  | tab bars: links for pages, buttons for views                              |
| `cdtTag`              | tag pills                                                                 |
| `<cdt-pager>`         | pagination                                                                |

The ones on native elements (`cdtButton`, `cdtInput`, `cdtTabs`, `cdtTab`, `cdtTag`, `cdtMenuItem`) are components with attribute selectors, as in Angular Material. That keeps native semantics and forms while letting them carry their own styles.

Feature libraries reuse the building blocks and don't define colours, fonts, shadows or control styles of their own. The rules, and check commands, are in [`.claude/skills/theme/SKILL.md`](.claude/skills/theme/SKILL.md).

## Accessibility

The site aims at **WCAG 2.2 level AA**, in both colour modes.

- **Structure:** a "Skip to main content" link first, one `<main>` per page, a named navigation landmark, one `<h1>` per page and headings in order. Every page has its own title ("Sign in · Everise", the article's title on an article).
- **Keyboard:** everything works without a mouse. Links are real links and actions are real buttons (tabs, tags, the pager, deleting a comment). After a page change the focus moves to the new content. Dialogs keep the focus inside and return it when they close; the account menu and the picture cropper have their own keys.
- **Forms:** visible labels on every field, required fields marked, `autocomplete` on sign-in and sign-up fields, `aria-invalid` on invalid fields, and error messages that screen readers announce.
- **Screen readers:** icons are hidden from them, icon-only buttons have names ("Favorite, 7 favorites", with `aria-pressed`), the current tab and page are `aria-current`, and status messages (loading, the roulette's result, form errors) are live regions.
- **Colour and contrast:** text is at least 4.5:1 and field outlines and the focus ring at least 3:1 against their background, checked for every role token in both modes.
- **Motion:** animations respect `prefers-reduced-motion`, and the roulette's idle reels have a **Pause animations** button.
- **Zoom and small screens:** pages reflow down to 320 px wide without sideways scrolling, and dialogs scroll inside when the screen is short.

**Checking a change.** Run [axe](https://github.com/dequelabs/axe-core) (the browser extension, or `@axe-core/playwright`) on the pages you touched, signed in and out, in both modes; tab through them with the keyboard; and look at them at 320 px wide. The `theme` skill's rules keep colours on role tokens, whose contrast is already checked.

## Environments and deployment

The app runs on Cloudflare Workers. The deployed builds call the relative `/api`: a small Worker script ([worker/index.ts](worker/index.ts)) forwards `/api/*` to the [backend](https://github.com/denis-coccodi/everise-backend) Worker of the same environment over a [service binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/), and every other path is a static file (with `index.html` for unknown paths). The browser only ever talks to one site, so there is no CORS, the backend's cookies are first-party, and staging needs a single Cloudflare Access login.

```
Browser ──> prod / staging  ├─ static files (Angular build)
                             └─ /api/* ──service binding──> be-prod / be-staging backend
```

| Environment | URL                                   | Environment file                                                               | API                                                 | Deployed by                                                                               |
| ----------- | ------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| local       | http://localhost:4200                 | [environment.ts](apps/everise/src/environments/environment.ts)                 | http://localhost:8080/api (direct, CORS)            | `npm start`                                                                               |
| staging     | https://staging.everisefc.workers.dev | [environment.staging.ts](apps/everise/src/environments/environment.staging.ts) | `/api` → `be-staging` (binding in `wrangler.jsonc`) | every merge to `main` ([CI/CD](.github/workflows/ci-cd.yaml))                             |
| production  | https://prod.everisefc.workers.dev    | [environment.prod.ts](apps/everise/src/environments/environment.prod.ts)       | `/api` → `be-prod` (binding in `wrangler.jsonc`)    | by hand: Actions → Deploy production → Run workflow, only for commits that passed staging |

Staging is behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/): only allowed people can open it, after logging in once. CI gets through with an Access service token (`CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` repository secrets).

Local development: start the backend (`npx wrangler dev --port 8080` in the backend repo), then `npm start`; the dev build calls it directly. To develop against the staging backend, set `api_url` in `environment.ts` to its URL (there as a comment) and first open that URL in the browser to log in to Cloudflare Access; its CORS allows `localhost:4200`. `npm run start-sw` builds the app and serves the built files with `wrangler dev`; set `serviceWorker: true` in `environment.ts` to try the offline features.
