---
name: deploy
description: Ships the Everise Angular frontend to Cloudflare Workers (staging on every merge to main, production by hand) through the GitHub Actions pipeline or wrangler, and diagnoses failing CI/CD runs. Use when asked to deploy, push and deploy, check or re-run the pipeline, or fix a red build.
---

# Deploy the Everise frontend

Repo: `denis-coccodi/everise-frontend`, branch `main`. Cloudflare account ID: `ba2955b2991a5a38d46bc4144212e9cc` (same account as the backend).

| Environment | Worker    | URL                         | Build configuration / env file            | `/api` goes to                                        | wrangler                                                       |
| ----------- | --------- | --------------------------- | ----------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| local       | —         | http://localhost:4200       | `development` / `debug`: `environment.ts` | http://localhost:8080/api, called directly (editable) | `npx wrangler dev` (`npm run start-worker`)                    |
| staging     | `staging` | https://staging.everise.dev | `staging`: `environment.staging.ts`       | backend Worker `be-staging` (service binding)         | `npx wrangler deploy --env staging` (`npm run deploy:staging`) |
| production  | `prod`    | https://everise.dev         | `production`: `environment.prod.ts`       | backend Worker `be-prod` (service binding)            | `npx wrangler deploy` (`npm run deploy`)                       |

## How it fits together

- `wrangler.jsonc` (repo root) serves `dist/apps/everise` as static assets with SPA fallback, and runs `worker/index.ts` first for `/api/*` and `/article/*` (`assets.run_worker_first`). A post's page gets its link-preview tags (Open Graph, for Discord and others) from the post, read over the binding, and is otherwise the app's `index.html`. The script forwards `/api/*` requests to the backend Worker over the `API` service binding: `be-prod` at the top level, `be-staging` under `env.staging` (bindings are not inherited, so each environment sets its own). Staging is a separate Worker, `staging`; `main` and `assets` are inherited.
- The browser therefore only talks to the frontend's site: no CORS, and the backend's auth cookie is first-party (set on the frontend host). Staging needs only the frontend's Cloudflare Access login; the binding reaches the backend inside Cloudflare, without passing the backend's own Access lock.
- Deployed builds (`environment.staging.ts`, `environment.prod.ts`) use `api_url: '/api'`. Which backend answers is decided by the binding of the Worker you deploy to, so **build with the configuration of the environment you deploy to** mainly for the right environment file flags; the smoke test checks the bundle uses `/api`, not a dev URL.
- The bound backend Worker must exist under that name, or `/api` fails. Renaming a backend Worker needs a change here first.
- `environment.ts` is the local dev build: it calls a backend directly (default `http://localhost:8080/api`, staging as a comment; staging's CORS allows `localhost:4200`).
- The backend's default avatar URL is built from the backend's `BASE_URL`, which points at this site; the image is `apps/everise/src/assets/images/avatar-profile.png` here.

## Normal path: merge a PR into main

Changes reach `main` through pull requests (see the `feature-branch` skill). Merging triggers the staging deploy.

`.github/workflows/ci-cd.yaml` (**CI/CD**: push to `main`, PRs, and `workflow_dispatch` on any branch):

- **test**: `npm ci`, the size, structure and mobile-first checks (`scripts/check-sizes.mjs`, `scripts/check-structure.mjs`, `scripts/check-mobile-first.mjs`), `nx run-many -t lint test`, then the `production` and `staging` builds. This is the required check on `main` and, through the ruleset, on every branch.
- **deploy-staging** (after test, on push to `main` or a manual run): builds with `--configuration=staging`, deploys staging with message `<branch>@<sha>`, runs `scripts/smoke.sh create` against it, writes a summary (on `main`, with a link to the production workflow). Job-level `concurrency: deploy-staging` serializes deploys.
- Deploy another branch to staging: `gh workflow run ci-cd.yaml --ref <branch>`. There is one staging Worker, so this replaces what is there until the next merge to `main`. Tell the user which branch staging is now running.

`.github/workflows/deploy-production.yaml` (**Deploy production**, `workflow_dispatch` only):

- Fails unless started from `main`, then checks that `GITHUB_SHA` has a successful CI/CD push run; otherwise fails without deploying.
- Then builds with `--configuration=production`, `wrangler deploy`, and `scripts/smoke.sh read` (read-only).

Production deploys are the user's decision: they start it from Actions → Deploy production → **Run workflow**. Only start it yourself (`gh workflow run deploy-production.yaml --ref main`) when the user explicitly asks for a production deploy, and only after the commit's CI/CD run is green.

Before pushing, run `node scripts/check-sizes.mjs && node scripts/check-structure.mjs && node scripts/check-mobile-first.mjs && npx nx run-many -t lint test && npx nx run everise:build --configuration=production && npx nx run everise:build --configuration=staging` locally; it must exit 0.

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

## When something fails

Read the failing step first (`gh run view <id> --log-failed`), then look it up in [troubleshooting.md](troubleshooting.md): missing secrets, a dev build deployed, `/api` not reaching the Worker or the backend failing, Cloudflare Access refusing the smoke test, new `workers.dev` hostnames, stale versions in browsers, and Free-plan caps.
