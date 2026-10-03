---
name: feature-branch
description: The required way to make any change in this repo (code, tests, docs, config, skills) - work on a feature/<name> branch, push it freely, open a pull request to main, and merge only once the required test check passes. Use before the first edit of every change, and whenever asked to commit, push, open a PR, merge, or ship something to staging.
---

# Feature branch → pull request → main

`main` is protected: nobody, admins included, can push to it directly. Every change reaches `main` through a pull request, and the PR can only be merged once the `test` check (the CI/CD workflow's lint + test + build job) passes on a branch that is up to date with `main`. Merging into `main` then deploys to staging automatically. Production stays a separate manual step (see the `deploy` skill).

The same rules as the backend repo apply:

- Branch protection on `main`: PR required (0 approvals), `test` required and strict (up to date), enforced for admins, no force pushes, no deletion.
- Ruleset "make sure tests pass" on every branch (`~ALL`): no deletion, no force push (so integrate `main` with `git merge origin/main`, not rebase + force-push), `test` required, Copilot code review on every push. Repository admins can bypass it.
- GitHub environment `production` accepts deployments from `main` only; `staging` from any branch.

Inspect them with `gh api repos/denis-coccodi/nx-angular-social-example/branches/main/protection` and `gh api repos/denis-coccodi/nx-angular-social-example/rulesets`.

## 1. Start a branch before the first edit

```
git switch main
git pull --ff-only
git switch -c feature/<feature-name>
```

- `<feature-name>` is short kebab-case describing the change: `feature/cloudflare-deploy`, `feature/fix-sw-lint`, `feature/readme-deploy`. Use the `feature/` prefix for every change, fixes and docs included.
- One branch per change. If already on a feature branch for the same change, keep using it. If the working tree has unrelated uncommitted changes, ask the user before carrying them onto the new branch.
- Never commit on `main`. If commits were made on `main` by mistake, move them: `git switch -c feature/<name>` then reset local `main` to `origin/main` (check with the user before resetting).

## 2. Commit and push as often as needed

```
npx nx run-many -t lint test && npx nx run conduit:build --configuration=production && npx nx run conduit:build --configuration=staging   # must exit 0
git add <files> && git commit -m "..."
git push -u origin feature/<feature-name>             # later pushes: git push
```

The husky pre-commit hook runs `npm run format` (prettier check on affected files); fix with `npm run format:write`. Pushing to a feature branch deploys nothing. End commit messages with the attribution line from the current session's instructions.

## 3. Open a pull request to main

```
gh pr create --base main --head feature/<feature-name> --title "<what changed>" --body "<why, what, how it was tested>"
```

- The body says what changed and why, how it was verified, and anything the reviewer should check on staging after merge. End it with the PR attribution line from the session's instructions.
- Every later push to the branch updates the PR and re-runs `test`.

## 4. Wait for the required check

```
gh pr checks <number> --watch
gh pr view <number> --json mergeStateStatus,statusCheckRollup
```

- If `test` fails, read the log (`gh run view <run-id> --log-failed`), fix on the same branch, push again. See the `deploy` skill's "Known failure causes".
- If the PR is behind `main` (`mergeStateStatus: BEHIND`), run `gh pr update-branch <number>` and wait for `test` again.

## 5. Merge

Merge only when `test` has passed and the user has said to merge this change (an earlier "ship it", "merge it", or "deploy to staging" for this change counts). Otherwise, report the PR link and that it is ready to merge.

```
gh pr merge <number> --squash --delete-branch
git switch main && git pull --ff-only
```

After merging, follow the CI/CD push run on `main` (build → deploy-staging → smoke test) as in the `deploy` skill, and report the staging result.

## Notes

- To try a branch on staging before merging: `gh workflow run ci-cd.yaml --ref feature/<name>`. It replaces what staging runs until the next merge to `main`; tell the user.
- A change that needs a backend change too (new endpoint, new binding) goes through the backend repo's own feature-branch flow; deploy the backend to staging first.
