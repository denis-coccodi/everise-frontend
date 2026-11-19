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

A pre-commit hook runs `nx format:check --affected` (Prettier), and a commit-msg hook (`scripts/check-commit-msg.mjs`) refuses a message that doesn't start the Conventional Commits way (`fix(events): …`). Both are husky's, installed by `npm install`.

## Claude agents

The repository carries its own Claude Code agents in `.claude/agents/`:

| Agent           | Does                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `frontend-dev`  | Makes one change (code, tests, affected docs) and opens its PR.                                                           |
| `docs-writer`   | Docs-only changes to `docs/` and the site guide (`docs/_guide`).                                                          |
| `reviewer`      | Reviews a PR before it merges. Read-only.                                                                                 |
| `ci-doctor`     | Finds out why an Actions run failed. Read-only.                                                                           |
| `planner-bench` | Benchmarks a fight planner change on 88 kills' logs and reports what it does to the plans, deaths added first. Read-only. |

What it shares with `everise-backend` comes from the `everise` plugin, in its own repository, [everise-agents](https://github.com/denis-coccodi/everise-agents), switched on in `.claude/settings.json`:

- **`everise:orchestrator`:** plans work across both repositories and hands it to their agents, each in its own worktree; keeps a work board in `.claude/board.md` (ignored by git); merges what the user approved. Edits no code. Start it from the main checkout with `npm run orchestrator`, which runs `claude --agent everise:orchestrator --add-dir ../everise-backend` (it needs `claude` on the `PATH`). The added folder brings the backend's agents and skills along, which a setting can't do; started without it, the orchestrator says so and stops.
- **`everise:workspace`:** a skill with the rules for working across both repositories: one git worktree per change, who owns a checkout, ports, the order of a change across both.
- **The guard hook**, before every shell command. It blocks the git commands that trample other sessions' work (`git add -A`, `git stash`, `reset --hard`, force pushes, commits or pushes to `main`), branches not named `feature/`, `bugfix/` or `hotfix/`, production tags not named `prod-YYYY-MM-DD-HHMM`, `gh pr merge` before `test` passed, writes to branch protection, and `prettier --write` on a folder (it rewrites untouched files' line endings). It asks first before a deploy by hand (`npm run deploy`, `wrangler deploy`, the production workflow) or a write to production.
- **The session-start hook**, which tells each new session its checkout, branch, uncommitted files and the repository's other worktrees.

Committing the settings doesn't install the plugin: on each machine, once per clone, run from the repository's folder:

```sh
claude plugin marketplace add denis-coccodi/everise-agents --scope project
claude plugin install everise@everise --scope project
```

Several sessions work at once, so each change is made in its own git worktree, in `.claude/worktrees/` (ignored by git, Nx, Prettier, ESLint, Vitest and TypeScript). A new worktree needs `npm ci`, and its dev server runs on a port of its own, not 4200.

## Branches

- Every change goes through a `feature/`, `bugfix/` or `hotfix/` branch, with Conventional Commits and a pull request to `main`. `main` rejects direct pushes.
- Merge once `test` passes; the merge deploys staging. See [Deployment](deployment.md).
