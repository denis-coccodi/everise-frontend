---
title: Development
nav_order: 6
---

# Development

## Running locally

You need Node.js 22 and npm, and the [backend](https://github.com/denis-coccodi/everise-backend) checked out next to this repository.

1. **Backend:** `npm install`, create its `.dev.vars` (see the [backend docs](/docs/backend/configuration.html)), then `npx wrangler dev --port 8080`.
2. **Frontend:** `npm install`, then `npm start`. Open http://localhost:4200.

- **API address:** the local build calls the backend directly at `http://localhost:8080/api` (`apps/everise/src/environments/environment.ts`).
- **Duty Roulette:** it needs game data, so run the backend's duty refresh once.

## Commands

| Command                                                                 | What it does                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `npm start`                                                             | Dev server on port 4200                                                         |
| `npx nx run-many -t lint test`                                          | Lint and unit-test every project                                                |
| `npx nx run everise:build --configuration=production`                   | Production build in `dist/apps/everise` (`staging` for the staging build)       |
| `npm run start-worker`                                                  | Build, then serve with `wrangler dev` as deployed (with the Worker's SEO pages) |
| `npx nx graph`                                                          | The live project graph                                                          |
| `npm run api-types`                                                     | Regenerate the API types from the backend's `openapi.json`                      |
| `node scripts/check-sizes.mjs`                                          | Check every file is within its size limit                                       |
| `node scripts/check-structure.mjs`                                      | Check every file is in the right folder                                         |
| `node scripts/check-mobile-first.mjs`                                   | Check styles are written for phones first                                       |
| `node tools/diagrams/frontend-structure.js docs/frontend-structure.svg` | Regenerate the libraries diagram (`website-structure.js` for the pages)         |
| `node tools/crest/update-crest.mjs`                                     | Redraw the crest and `favicon.ico` from the free company's Lodestone page       |

## Before pushing

The required `test` check runs, in order:

```
node scripts/check-sizes.mjs && node scripts/check-structure.mjs && node scripts/check-mobile-first.mjs \
  && npx nx run-many -t lint test && npx tsc -p worker/tsconfig.json \
  && npx vitest run --config worker/vitest.config.mts \
  && npx nx run everise:build --configuration=production \
  && npx nx run everise:build --configuration=staging
```

A pre-commit hook runs `nx format:check --affected` (Prettier).

## Branches

- Every change goes through a `feature/`, `bugfix/` or `hotfix/` branch, with Conventional Commits and a pull request to `main`. `main` rejects direct pushes.
- Merge once `test` passes; the merge deploys staging. See [Deployment](deployment.md).
