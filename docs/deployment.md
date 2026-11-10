---
title: Deployment
nav_order: 7
---

# Deployment

## The Worker

The app runs on Cloudflare Workers. A small Worker script (`worker/index.ts`):

- forwards `/api/*` to the backend Worker of the same environment, over a service binding;
- serves every other path as a static file, with `index.html` for unknown paths;
- gives the main pages their search-engine metadata (below).

```
Browser ──> prod / staging  ├─ static files (Angular build)
                             └─ /api/* ──service binding──> be-prod / be-staging backend
```

Because `/api` is same-origin, the session cookie and the live-updates WebSocket (`wss://<site>/api/live`) need no CORS.

## Environments

| Environment | URL                         | Environment file         | API                                      | Deployed by                              |
| ----------- | --------------------------- | ------------------------ | ---------------------------------------- | ---------------------------------------- |
| local       | http://localhost:4200       | `environment.ts`         | http://localhost:8080/api (direct, CORS) | `npm start`                              |
| staging     | https://staging.everise.dev | `environment.staging.ts` | `/api` → `be-staging`                    | every merge to `main`                    |
| production  | https://everise.dev         | `environment.prod.ts`    | `/api` → `be-prod`                       | by hand, for commits that passed staging |

- **Old addresses:** each Worker's custom domain is under `routes` in `wrangler.jsonc`. The old `workers.dev` addresses still work.
- **Staging access:** staging is behind Cloudflare Access, so only allowed people can open it. CI gets through with an Access service token (`CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`).
- **Turnstile:** the bot check uses `turnstileSiteKey` from the environment file. Staging and production use the Everise widget's key; locally, Cloudflare's test key always passes.

## CI/CD

- **Test and deploy staging** (`.github/workflows/ci-cd.yaml`):
  - runs the `test` check on every pull request and push (see [Development](development.md#before-pushing));
  - runs the `api-types` check against the backend's committed `openapi.json`;
  - on `main`, deploys the `staging` Worker and runs `scripts/smoke.sh` against it.
- **Deploy production:** Actions → Deploy production → Run workflow, only for commits that passed staging. Each run tags the commit `prod-YYYY-MM-DD-HHMM`, so the latest `prod-*` tag is what production runs.
- **Dependabot:** opens PRs every Monday, one for Angular/Nx/NgRx minor and patch updates, one for every other minor and patch update, and one per other major. Angular, Nx and NgRx majors go through `npx nx migrate latest` instead.

## Releases

- **Trunk-based:** `main` must always be fine to deploy. Branches last a day or two, and there is no `develop` or release branch.
- **Feature flags:** a feature that takes several PRs merges switched off in production, behind its flag in `features`. To release it:
  1. set it to `true` in `environment.prod.ts`, and in the backend's production `FEATURES`;
  2. deploy the backend, then the frontend;
  3. remove the flag once it has settled.
- **Hotfixes:** a production fix is normally a `hotfix/` branch merged into `main`. Only if `main` holds something that can't ship yet does it start from the latest `prod-*` tag. See the `trunk-based` skill.

## Search engines

- **Metadata:** the Worker gives the pages people search for their own title, description, canonical address, link-preview card and schema.org data: home, the Party Finder and each data centre's page, the roulette, The Waking Sands, and posts.
- **Crawling:** `robots.txt` and `sitemap.xml` list what to crawl. The sitemap comes from the backend's `GET /api/sitemap`.
- **Excluded:** event pages are kept out of search engines; Partake is their home.
