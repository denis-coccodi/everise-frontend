![Everise running app](https://raw.githubusercontent.com/denis-coccodi/everise-frontend/refs/heads/main/apps/everise/src/assets/images/Screenshot%202026-04-15%20125706.png)

## Architecture

### Frontend structure

![Everise frontend: Nx apps and libraries by layer, with their dependencies](docs/frontend-structure.svg)

One Angular app (`apps/everise`) is a thin shell: routes, guard, HTTP setup and layout. Everything else lives in libraries under `libs/`, grouped by domain (`auth`, `articles`, `home`, `profile`, `settings`) and layered:

- **feature** libs: one per page, lazy-loaded by the router (`feature-articles-list` is the exception: a shared list used by Home and Profile);
- **data-access** libs: NgRx signal stores, API services, guards and resolvers;
- **core** and **ui** libs: API types, HTTP client, form errors and error handling; the **ui** lib also holds the theme and the themed building blocks every page uses ([Theme](#theme)). They have no dependencies on other libs.

Dependencies only point down a layer or sideways within a domain. `npx nx graph` shows the live graph.

### Website structure

![Everise website: pages, what they show, where they lead, and site-wide rules](docs/website-structure.svg)

Both images are generated: run `node tools/diagrams/frontend-structure.js docs/frontend-structure.svg` (or `website-structure.js`) after changing the structure, then refresh the PNG copy with headless Edge, e.g. `msedge --headless=new --hide-scrollbars --window-size=1560,960 --screenshot=docs/frontend-structure.png docs/frontend-structure.svg` (`1560,1056` for the website image).

### Theme

The site looks like Final Fantasy / FFXIV: crystal motifs, deep-blue windows, silver-white trim and Cinzel headings. It has two modes:

- **dark (default):** near-black navy backdrop with crystal-teal highlights;
- **light:** Final Fantasy white, with royal-blue highlights. Turn Settings → Dark Mode off to switch to it.

The UI library ([`libs/ui/components`](libs/ui/components), imported as `@realworld/ui/components`) owns that look.

**It defines the theme** in [`src/theme`](libs/ui/components/src/theme), in three layers:

- **palette** colours, used only inside the theme;
- **role** tokens that everything else uses: `--color-base`, `--color-surface`, `--color-contrast`, `--color-heading`, `--color-primary`, `--color-secondary`, `--color-accent`, `--color-crystal`, `--font-display`, `--radius-*`, `--shadow-*`, `--gradient-*`, …;
- **classes** such as `.xiv-panel`, `.btn-primary` and `.form-control`.

**It provides the dumb, themed building blocks** every page uses:

| Building block       | For                        |
| -------------------- | -------------------------- |
| `cdtButton`          | buttons and button links   |
| `cdtInput`           | text fields and text areas |
| `<cdt-checkbox>`     | a checkbox with its label  |
| `<cdt-panel>`        | a window                   |
| `<cdt-dialog>`       | a modal window             |
| `cdtTabs` / `cdtTab` | tab bars                   |
| `cdtTag`             | tag pills                  |
| `<cdt-pager>`        | pagination                 |

**The app propagates it.** [`apps/everise/src/styles.scss`](apps/everise/src/styles.scss) loads the theme once, and below that only lays out pages.

Feature libraries reuse the building blocks and don't define colours, fonts, shadows or control styles of their own. The rules, and check commands, are in [`.claude/skills/theme/SKILL.md`](.claude/skills/theme/SKILL.md).

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
