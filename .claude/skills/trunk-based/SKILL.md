---
name: trunk-based
description: How changes reach production in this repo - trunk-based development (one main branch, short-lived branches, main always releasable), feature flags (`features` in the environment files) that keep unfinished features off in production, the prod-* tags that mark each production deploy, and how to release a feature or hotfix production. Use before starting a feature that takes more than one PR, when adding, switching on or removing a feature flag, when asked what production runs, and when production needs a fix but main has changes that aren't ready.
---

# Trunk-based development

There is one long-lived branch, `main`. Every change is a short-lived `feature/`, `bugfix/` or `hotfix/` branch merged into it through a pull request (the `feature-branch` skill), usually within a day or two. There is no `develop` branch and no release branches.

**`main` is always releasable.** Merging deploys staging; production is deployed from `main` by hand whenever the user decides (the `deploy` skill). Anything merged must therefore be fine in production as it is. A feature that takes several PRs merges each of them **switched off in production** behind a feature flag, so production never waits on unfinished work and a fix never has to wait behind it.

The backend (`../everise-backend`) works the same way, with its `FEATURES` setting. A feature that spans both repos gets a flag of the same name in each, and both are switched on together.

## Feature flags

`features` in each environment file lists the features that can be switched, each `true` or `false`:

| File                     | Value                                                  |
| ------------------------ | ------------------------------------------------------ |
| `environment.ts` (local) | whatever you are working on (`true` while building it) |
| `environment.staging.ts` | every feature being built: `true`                      |
| `environment.prod.ts`    | only the released ones: `true`; the rest `false`       |

The three files must name the same features (the build takes its type from `environment.ts`). The flags are read only in the app shell (`apps/everise`), where a feature is reached:

- **its routes' mount** in `app.routes.ts`, spread in only when the flag is on (`...(environment.features.<name> ? [ ... ] : [])`). Switched off, its address falls through to the `**` route like any unknown path, and its library is never loaded;
- **its navbar link** in `layout/nav-group/nav-groups.ts`, through `navGroups(features)`, with a spec that the link is missing when the flag is off;
- any other entry point (a home page card, a link from another page) the same way.

Feature, data-access and UI libraries don't read the flags: once a feature can't be reached, nothing else needs to know. Keep the flag's checks this few, so removing it later is a small change.

### Adding a flag

1. Add `<name>: true` to `features` in `environment.ts` and `environment.staging.ts`, `<name>: false` in `environment.prod.ts`.
2. Put the feature's routes and links behind it, with a spec for the off case.
3. In the backend, add the same flag if the feature has endpoints (its `trunk-based` skill).

### Releasing a feature

1. Set it to `true` in `environment.prod.ts` in its own PR (`feat(<scope>): release <feature>`), with the backend's matching PR.
2. Merge, then deploy production: the backend first, then the frontend.
3. Once it has run in production for a while, remove the flag in a follow-up PR: the key in the three environment files and the checks. Flags are temporary; don't let them pile up.

## What production runs: prod-* tags

Every **Deploy production** run tags the commit it deployed `prod-YYYY-MM-DD-HHMM` (UTC) and pushes the tag. The latest such tag is what production runs:

```
git fetch --tags
git tag --list 'prod-*' --sort=-creatordate | head -1
git log --oneline <tag>..origin/main        # what's on main but not yet in production
```

A deploy by hand (`npx wrangler deploy`) isn't tagged by the workflow; tag it yourself the same way (`git tag prod-… <sha> && git push origin prod-…`), and deploy with `--message "<branch>@<short sha>"` so `npx wrangler deployments list` shows it.

Saved release branches (`release/<date>`) aren't needed: a tag marks the same commit, and a branch can be started from it whenever one is needed.

## Hotfixing production

1. **Normally**, a hotfix is an ordinary branch: `hotfix/<description>` from `main`, a PR, merge, then deploy production from `main` (the `deploy` skill). Because `main` is always releasable, this ships only what's ready.
2. **Only if `main` holds something that must not reach production** (a change that should have been behind a flag): start the branch from the latest `prod-*` tag instead (`git switch -c hotfix/<description> <tag>`), run the full checks from CLAUDE.md, push it, build with `--configuration=production` and deploy it by hand with `npx wrangler deploy --message "hotfix/<description>@<sha>"` (only when the user asks for it), run `sh scripts/smoke.sh read https://everise.dev`, and tag it as above. Then open a PR from the same branch to `main` (`gh pr update-branch` brings it up to date), so the fix isn't lost on the next deploy. Afterwards, put the change that blocked `main` behind a flag.
