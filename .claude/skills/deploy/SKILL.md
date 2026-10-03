---
name: deploy
description: Ship the Conduit Angular frontend to Cloudflare Workers (staging, then production) through the GitHub Actions pipeline, or by hand with wrangler, and diagnose failing CI/CD runs. Use when asked to deploy, push and deploy, check or re-run the pipeline, or fix a red build.
---

# Deploy the Conduit frontend

Repo: `denis-coccodi/nx-angular-social-example`, branch `main`. Cloudflare account ID: `ba2955b2991a5a38d46bc4144212e9cc` (same account as the backend).

| Environment | Worker                | URL                                                   | Build configuration / env file            | Calls backend                                         | wrangler                                                       |
| ----------- | --------------------- | ----------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| local       | —                     | http://localhost:4200                                 | `development` / `debug`: `environment.ts` | http://localhost:8080/api (editable)                  | `npx wrangler dev` (`npm run start-sw`)                        |
| staging     | `conduit-web-staging` | https://conduit-web-staging.denis-coccodi.workers.dev | `staging`: `environment.staging.ts`       | https://conduit-staging.denis-coccodi.workers.dev/api | `npx wrangler deploy --env staging` (`npm run deploy:staging`) |
| production  | `conduit-web`         | https://conduit-web.denis-coccodi.workers.dev         | `production`: `environment.prod.ts`       | https://conduit.denis-coccodi.workers.dev/api         | `npx wrangler deploy` (`npm run deploy`)                       |

## How it fits together

- `wrangler.jsonc` (repo root) only serves `dist/apps/conduit` as static assets with SPA fallback; there is no Worker script. Staging is `env.staging` (a separate Worker, `conduit-web-staging`); `assets` is inherited.
- The backend URL is baked in at build time by `fileReplacements` in `apps/conduit/project.json`, so **build with the configuration of the environment you deploy to**: `--configuration=staging` before `wrangler deploy --env staging`, `--configuration=production` before `wrangler deploy`. Deploying the wrong build points the site at the wrong backend; the smoke test catches it (`bundle calls <api-url>`).
- `environment.ts` is the local default and is meant to be edited by hand: it lists the staging and production URLs as comments. Its `serviceWorker` flag is off locally; the staging and production files turn it on.
- The browser calls the backend cross-origin with credentials. The backend's `CORS_ORIGINS` (its `wrangler.jsonc`, per environment) must list the frontend's origin; `localhost:4200` is allowed on both backends. A new frontend URL needs a backend change first (backend repo: `../typescript-cloudflare-backend`, see its `deploy` skill).
- The auth cookie is `SameSite=None; Secure`. Every `*.workers.dev` subdomain is a separate site, so it is a third-party cookie for the deployed frontends: browsers that block third-party cookies (Safari by default) will not stay logged in. Serving frontend and backend under one custom domain would fix it.

## Normal path: merge a PR into main

Changes reach `main` through pull requests (see the `feature-branch` skill). Merging triggers the staging deploy.

`.github/workflows/ci-cd.yaml` (**CI/CD**: push to `main`, PRs, and `workflow_dispatch` on any branch):

- **test**: `npm ci`, `nx run-many -t lint test`, then the `production` and `staging` builds. This is the required check on `main` and, through the ruleset, on every branch.
- **deploy-staging** (after test, on push to `main` or a manual run): builds with `--configuration=staging`, deploys staging with message `<branch>@<sha>`, runs `scripts/smoke.sh create` against it, writes a summary (on `main`, with a link to the production workflow). Job-level `concurrency: deploy-staging` serializes deploys.
- Deploy another branch to staging: `gh workflow run ci-cd.yaml --ref <branch>`. There is one staging Worker, so this replaces what is there until the next merge to `main`. Tell the user which branch staging is now running.

`.github/workflows/deploy-production.yaml` (**Deploy production**, `workflow_dispatch` only):

- Fails unless started from `main`, then checks that `GITHUB_SHA` has a successful CI/CD push run; otherwise fails without deploying.
- Then builds with `--configuration=production`, `wrangler deploy`, and `scripts/smoke.sh read` (read-only).

Production deploys are the user's decision: they start it from Actions → Deploy production → **Run workflow**. Only start it yourself (`gh workflow run deploy-production.yaml --ref main`) when the user explicitly asks for a production deploy, and only after the commit's CI/CD run is green.

Before pushing, run `npx nx run-many -t lint test && npx nx run conduit:build --configuration=production && npx nx run conduit:build --configuration=staging` locally; it must exit 0.

After merging, wait for the run on `main` and report each job:

```
gh run list --limit 1
gh run view <id>
gh run view <id> --json status,jobs -q '{run: .status, jobs: [.jobs[] | {name, status, conclusion}]}'
gh run view <id> --log-failed
gh run rerun <id> --failed
```

## Manual deploy

Wrangler on this machine is logged in with OAuth (`npx wrangler whoami`). Build with the matching configuration first (`npm run deploy:staging` / `npm run deploy` do both). Deploying production by hand skips the "passed staging" check, so only do it when the user explicitly asks for a manual production deploy. `npx wrangler deploy --dry-run [--env staging]` checks the config without deploying.

## Secrets

- The frontend has no Worker secrets.
- GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set by the user (the backend repo's token works if it has the "Edit Cloudflare Workers" permissions). Writing them with `gh secret set` is blocked by the permission classifier, so give the user the steps: repo Settings → Secrets and variables → Actions → New repository secret. Never ask them to paste the token into chat.
- GitHub environments (`staging`, `production`) are created on the first run that uses them; rules can be managed with `gh api repos/<repo>/environments/<name>`.

## Known failure causes

- **Missing secrets**: the deploy step fails with "it's necessary to set a CLOUDFLARE_API_TOKEN". Fix on GitHub, then `gh run rerun --failed`.
- **Smoke test: `no bundle script contains <api-url>`**: the deployed build was made with the wrong configuration. Rebuild with the right one and redeploy.
- **Smoke test: `[cors: … not allowed with credentials]`**, or in the browser "blocked by CORS policy": the backend of that environment does not list the frontend origin in `CORS_ORIGINS`, or that backend change is not deployed yet.
- **Smoke test gets `404` / `error code: 1042`**: a brand-new `workers.dev` hostname is not live yet. Only on a Worker's first deploy; re-run the job after a minute.
- **API calls return 5xx but the shell loads**: the backend is failing; check it with the backend's `smoke-test` skill.
- **Logged out right after logging in (Safari, strict privacy settings)**: third-party cookie blocked; see "How it fits together".
- **Users see an old version after deploy**: `offline-sw.js` caches responses; a hard reload or unregistering the service worker fixes it.
- **Free-plan caps**: daily request limits are shared by all Workers on the account.
