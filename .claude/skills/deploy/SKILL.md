---
name: deploy
description: Ship the Conduit Angular frontend to Cloudflare Workers (staging, then production) through the GitHub Actions pipeline, or by hand with wrangler, and diagnose failing CI/CD runs. Use when asked to deploy, push and deploy, check or re-run the pipeline, or fix a red build.
---

# Deploy the Conduit frontend

Repo: `denis-coccodi/nx-angular-social-example`, branch `main`. Cloudflare account ID: `ba2955b2991a5a38d46bc4144212e9cc` (same account as the backend).

| Environment | Worker                | URL                                                   | Talks to backend  | wrangler                                                       |
| ----------- | --------------------- | ----------------------------------------------------- | ----------------- | -------------------------------------------------------------- |
| staging     | `conduit-web-staging` | https://conduit-web-staging.denis-coccodi.workers.dev | `conduit-staging` | `npx wrangler deploy --env staging` (`npm run deploy:staging`) |
| production  | `conduit-web`         | https://conduit-web.denis-coccodi.workers.dev         | `conduit`         | `npx wrangler deploy` (`npm run deploy`)                       |

## How it fits together

- `wrangler.jsonc` (repo root) serves `dist/apps/conduit` as static assets with SPA fallback. Only `/api/*` runs the Worker (`apps/conduit/worker.js`), which forwards the request to the backend Worker bound as `API` (a service binding). The API is therefore same-origin: no CORS, and the backend's httpOnly `token` cookie is first-party (`*.workers.dev` is a public suffix, so a cross-subdomain cookie would be third-party and blocked by Safari/Firefox).
- Both `environment.ts` and `environment.prod.ts` use `api_url: '/api'`, so one production build serves both environments; the environment is chosen by the wrangler `--env`, like the backend.
- `services` is not inherited by `env.staging`; any new binding must be added in both places. `assets` is inherited.
- The backend Worker must exist before the frontend binding to it can deploy. Backend repo: `../typescript-cloudflare-backend` (see its own `deploy` skill).

## Normal path: merge a PR into main

Changes reach `main` through pull requests (see the `feature-branch` skill). Merging triggers the staging deploy.

`.github/workflows/ci-cd.yaml` (**CI/CD**: push to `main`, PRs, and `workflow_dispatch` on any branch):

- **test**: `npm ci`, `nx run-many -t lint test`, then `nx run conduit:build --configuration=production`. This is the required check on `main` and, through the ruleset, on every branch.
- **deploy-staging** (after test, on push to `main` or a manual run): builds, deploys staging with message `<branch>@<sha>`, runs `scripts/smoke.sh create` against it, writes a summary (on `main`, with a link to the production workflow). Job-level `concurrency: deploy-staging` serializes deploys.
- Deploy another branch to staging: `gh workflow run ci-cd.yaml --ref <branch>`. There is one staging Worker, so this replaces what is there until the next merge to `main`. Tell the user which branch staging is now running.

`.github/workflows/deploy-production.yaml` (**Deploy production**, `workflow_dispatch` only):

- Fails unless started from `main`, then checks that `GITHUB_SHA` has a successful CI/CD push run; otherwise fails without deploying.
- Then build, `wrangler deploy`, and `scripts/smoke.sh read` (read-only).

Production deploys are the user's decision: they start it from Actions → Deploy production → **Run workflow**. Only start it yourself (`gh workflow run deploy-production.yaml --ref main`) when the user explicitly asks for a production deploy, and only after the commit's CI/CD run is green.

Before pushing, run `npx nx run-many -t lint test && npx nx run conduit:build --configuration=production` locally; it must exit 0.

After merging, wait for the run on `main` and report each job:

```
gh run list --limit 1
gh run view <id>
gh run view <id> --json status,jobs -q '{run: .status, jobs: [.jobs[] | {name, status, conclusion}]}'
gh run view <id> --log-failed
gh run rerun <id> --failed
```

## Manual deploy

Wrangler on this machine is logged in with OAuth (`npx wrangler whoami`). Build first (`npm run deploy:staging` / `npm run deploy` do build + deploy). Deploying production by hand skips the "passed staging" check, so only do it when the user explicitly asks for a manual production deploy. `npx wrangler deploy --dry-run [--env staging]` shows the bindings without deploying.

## Secrets

- The frontend has no Worker secrets.
- GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set by the user (the backend repo's token works if it has the "Edit Cloudflare Workers" permissions). Writing them with `gh secret set` is blocked by the permission classifier, so give the user the steps: repo Settings → Secrets and variables → Actions → New repository secret. Never ask them to paste the token into chat.
- GitHub environments (`staging`, `production`) are created on the first run that uses them; rules can be managed with `gh api repos/<repo>/environments/<name>`.

## Known failure causes

- **Missing secrets**: the deploy step fails with "it's necessary to set a CLOUDFLARE_API_TOKEN". Fix on GitHub, then `gh run rerun --failed`.
- **Deploy fails on the service binding**: the backend Worker (`conduit` / `conduit-staging`) does not exist yet. Deploy the backend first.
- **Smoke test gets `404` / `error code: 1042`**: a brand-new `workers.dev` hostname is not live yet. Only on a Worker's first deploy; re-run the job after a minute.
- **`/api/*` returns 5xx but the shell loads**: the backend is failing; check it with the backend's `smoke-test` skill.
- **Users see an old version after deploy**: `offline-sw.js` caches responses; a hard reload or unregistering the service worker fixes it.
- **Free-plan caps**: daily request limits are shared by all Workers on the account; every `/api` call counts against both the frontend and the backend Worker.
