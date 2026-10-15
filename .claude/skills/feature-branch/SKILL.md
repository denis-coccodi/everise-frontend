---
name: feature-branch
description: Describes the required way to make any change in this repo (code, tests, docs, config, skills): a feature/<name> branch, pull requests to main, merging once the required test check passes, and the Windows line-ending traps of the pre-commit format check. Use before the first edit of every change, and whenever asked to commit, push, open a PR, merge, or ship something to staging.
---

# Feature branch → pull request → main

`main` is protected: nobody, admins included, can push to it directly. Every change reaches `main` through a pull request, and the PR can only be merged once the `test` check (the CI/CD workflow's lint + test + build job) passes on a branch that is up to date with `main`. Merging into `main` then deploys to staging automatically. Production stays a separate manual step (see the `deploy` skill).

The same rules as the backend repo apply:

- Branch protection on `main`: PR required (0 approvals), `test` required and strict (up to date), enforced for admins, no force pushes, no deletion.
- Ruleset "make sure tests pass" on every branch (`~ALL`): no deletion, no force push (so integrate `main` with `git merge origin/main`, not rebase + force-push), `test` required, Copilot code review on every push. Repository admins can bypass it.
- GitHub environment `production` accepts deployments from `main` only; `staging` from any branch.

Inspect them with `gh api repos/denis-coccodi/everise-frontend/branches/main/protection` and `gh api repos/denis-coccodi/everise-frontend/rulesets`.

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
node scripts/check-sizes.mjs && node scripts/check-structure.mjs && node scripts/check-mobile-first.mjs && npx nx run-many -t lint test && npx nx run everise:build --configuration=production && npx nx run everise:build --configuration=staging   # must exit 0
git add <files> && git commit -m "..."
git push -u origin feature/<feature-name>             # later pushes: git push
```

The husky pre-commit hook runs `npm run format` (prettier check on affected files); fix with `npm run format:write`. Pushing to a feature branch deploys nothing. End commit messages with the attribution line from the current session's instructions.

### Line endings and the pre-commit format check

The husky hook runs `nx format:check --affected`: Prettier on every file the commit touches. On a Windows checkout some files have CRLF line endings that Prettier rewrites, which leads to three traps:

- **Format only the files you changed** (`npx prettier --write <files>`), never a whole folder. A folder run rewrites untouched files' line endings; they then show as modified with an empty diff (`git diff --ignore-cr-at-eol --stat` prints nothing). Restore them with `git checkout -- <file>`.
- **A touched file that was already unformatted on `main`** (the README has been) fails the hook. Format it as part of the change; its diff stays your own lines.
- **A file restored from `main`** (`git checkout origin/main -- <file>`) still counts as touched. Run Prettier on it before committing.

Undo a commit already pushed with `git revert`: force pushes are refused.

## 3. Open a pull request to main

```
gh pr create --base main --head feature/<feature-name> --title "<what changed>" --body "<why, what, how it was tested>"
```

- **A change to anything on screen** (a template, a style, a new UI item) gets the `ui-check` skill's spacing pass first: every breakpoint (320, 390, 768, 1024, 1280), signed in and out, looking at edges, gaps between stacked boxes, overflow and the space below the footer. Don't open the PR until each width looks right.
- The body says what changed and why, how it was verified (for UI: the widths and states looked at), and anything the reviewer should check on staging after merge. End it with the PR attribution line from the session's instructions.
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
