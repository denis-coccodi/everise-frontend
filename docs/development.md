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

## Claude agents

The repository carries Claude Code agents in `.claude/agents/`:

| Agent           | Does                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `frontend-dev`  | Makes one change (code, tests, affected docs) and opens its PR.                                                           |
| `docs-writer`   | Docs-only changes to `docs/` and the site guide (`docs/_guide`).                                                          |
| `reviewer`      | Reviews a PR before it merges. Read-only.                                                                                 |
| `ci-doctor`     | Finds out why an Actions run failed. Read-only.                                                                           |
| `planner-bench` | Benchmarks a fight planner change on 88 kills' logs and reports what it does to the plans, deaths added first. Read-only. |

The `orchestrator` lives in `everise-backend` and runs as the main session there (`claude --agent orchestrator --add-dir ../everise-frontend`): it splits a request into one-PR tasks, sends the frontend ones to the Claude window open on this repository, and keeps the work board, `.claude/board.md` in the folder that holds both repositories.

Several sessions work at once, so each change is made in its own git worktree, in `.claude/worktrees/` (ignored by git, Nx, Prettier, ESLint, Vitest and TypeScript). A new worktree needs `npm ci`, and its dev server runs on a port of its own, not 4200.

`.claude/settings.json` runs two hooks. `.claude/hooks/session-start.mjs` tells each new session which checkout and branch it's in, what's uncommitted there, and the repository's other worktrees. `.claude/hooks/guard.mjs` runs before every shell command and blocks:

- staging everything (`git add -A`, `.`, `-u`), and `git stash` without a unique message;
- discarding all changes (`reset --hard`, `clean -f`, `checkout .`);
- force pushes, pushes to `main`, and commits on `main` or a detached HEAD;
- switching branches in a checkout with uncommitted changes;
- a new or renamed branch not named `feature/`, `bugfix/` or `hotfix/<description>`;
- a production tag not named `prod-YYYY-MM-DD-HHMM`;
- `gh pr merge` before the pull request's `test` check has passed;
- changing branch protection or rulesets (`gh api` writes to them);
- `prettier --write` on a folder or a glob (it rewrites untouched files' line endings).

It asks first before a write to production (`curl` or `Invoke-RestMethod` sending data to everise.dev or apis.everise.dev; reads and staging stay free), and `settings.json` itself before any `npm run deploy`, `wrangler deploy` or production deploy workflow run.

## Branches

- Every change goes through a `feature/`, `bugfix/` or `hotfix/` branch, with Conventional Commits and a pull request to `main`. `main` rejects direct pushes.
- Merge once `test` passes; the merge deploys staging. See [Deployment](deployment.md).
