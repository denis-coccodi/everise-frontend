---
name: feature-branch
description: Describes the required way to make any change in this repo (code, tests, docs, config, skills): a bugfix/, hotfix/ or feature/<description> branch, Conventional Commits messages and PR titles, pull requests to main, merging once the required test check passes, and the Windows line-ending traps of the pre-commit format check. Use before the first edit of every change, and whenever asked to name a branch, commit, write a commit message, push, open a PR, merge, or ship something to staging.
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
git switch -c <branch>      # bugfix/…, hotfix/… or feature/…
```

- Name the branch `<type>/<description>`, the type saying what kind of change it is:
  - `bugfix/`: a bug fix, something that doesn't work as it should (`bugfix/menu-see-through`, `bugfix/sw-lint-error`). Never `feature/` for a fix.
  - `hotfix/`: an urgent fix for something broken in production, deployed by hand right after it merges (the `deploy` skill).
  - `feature/`: everything else: a new feature, a change in behaviour, docs, config, skills, refactoring (`feature/events-page`, `feature/readme-deploy`).
- The description is 2 to 5 words saying what the branch does, lowercase, words joined by hyphens: letters, digits and hyphens only, no trailing hyphen, no dates or names. Below, `<branch>` stands for the whole name.
- One branch per change. If already on a branch for the same change, keep using it. If the working tree has unrelated uncommitted changes, ask the user before carrying them onto the new branch.
- Never commit on `main`. If commits were made on `main` by mistake, move them: `git switch -c <branch>` then reset local `main` to `origin/main` (check with the user before resetting).

## 2. Commit and push as often as needed

```
node scripts/check-sizes.mjs && node scripts/check-structure.mjs && node scripts/check-mobile-first.mjs && npx nx run-many -t lint test && npx nx run everise:build --configuration=production && npx nx run everise:build --configuration=staging   # must exit 0
git add <files> && git commit -m "..."
git push -u origin <branch>             # later pushes: git push
```

The husky pre-commit hook runs `npm run format` (prettier check on affected files); fix with `npm run format:write`. Pushing to a branch other than `main` deploys nothing. End commit messages with the attribution line from the current session's instructions.

### Line endings and the pre-commit format check

The husky hook runs `nx format:check --affected`: Prettier on every file the commit touches. On a Windows checkout some files have CRLF line endings that Prettier rewrites, which leads to three traps:

- **Format only the files you changed** (`npx prettier --write <files>`), never a whole folder. A folder run rewrites untouched files' line endings; they then show as modified with an empty diff (`git diff --ignore-cr-at-eol --stat` prints nothing). Restore them with `git checkout -- <file>`.
- **A touched file that was already unformatted on `main`** (the README has been) fails the hook. Format it as part of the change; its diff stays your own lines.
- **A file restored from `main`** (`git checkout origin/main -- <file>`) still counts as touched. Run Prettier on it before committing.

Undo a commit already pushed with `git revert`: force pushes are refused.

### Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) and [the seven rules of a good commit message](https://cbea.ms/git-commit/):

```
fix(events): add .webp to banner names without an extension

Partake's CDN answers a bare attachment name with a 500 but serves it
with .webp added, so 13 of 139 events showed no banner. assetUrl now
adds the extension; names that have one are unchanged.

Co-Authored-By: …
```

- **Subject:** `<type>(<scope>): <description>`.
  - The type matches the branch: `fix` on a `bugfix/` or `hotfix/` branch; on a `feature/` branch `feat` (something new for users), `refactor`, `perf`, `test`, `docs`, `build`, `ci` or `chore`.
  - The scope is the area touched, one word, like the `src/` or `libs/` folder (events, venues, navbar, ui, api-types, ci, skills). Leave it out when the change has no single area.
  - The description is in the imperative, as if completing "If applied, this commit will …": `add`, `fix`, `show`, not `added` or `adds`. Lowercase after the colon, no full stop.
  - Keep the whole subject to 50 characters where you can, 72 at most. The squash merge adds " (#123)".
  - A breaking API change (a removed or renamed field or endpoint) gets `!` before the colon (`feat(api)!: …`) and a `BREAKING CHANGE: …` footer.
- **Body:** after a blank line, wrapped at 72 columns. Say what was wrong or missing and why this is the fix; the diff shows how. A small, obvious change needs no body.
- **Footers:** after another blank line: `Refs: #123` when there is an issue, then the attribution line from the current session's instructions.
- One logical change per commit; a follow-up fix on the same branch is its own commit (`fix(events): …`), never a "wip" or "fix stuff".
- For a multi-line message, write it with a heredoc (`git commit -F - <<'EOF'`), not several `-m`.

## 3. Open a pull request to main

```
gh pr create --base main --head <branch> --title "<type>(<scope>): <description>" --body "<why, what, how it was tested>"
```

- The title is the commit subject the squash merge puts on `main`, so it follows the subject rules above. For a branch with several commits, it sums them up.
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
gh pr merge <number> --squash --delete-branch --subject "$(gh pr view <number> --json title -q .title) (#<number>)"
git switch main && git pull --ff-only
```

After merging, follow the CI/CD push run on `main` (build → deploy-staging → smoke test) as in the `deploy` skill, and report the staging result.

## Notes

- To try a branch on staging before merging: `gh workflow run ci-cd.yaml --ref <branch>`. It replaces what staging runs until the next merge to `main`; tell the user.
- A change that needs a backend change too (new endpoint, new binding) goes through the backend repo's own feature-branch flow; deploy the backend to staging first.
