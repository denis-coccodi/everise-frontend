---
name: frontend-dev
description: Builds one frontend change (code, tests and the docs it affects) in its own worktree, on its own branch, and opens the pull request. Use for any change under apps/, libs/, worker/ or docs/ that comes with code; start it with isolation "worktree".
isolation: worktree
skills: feature-branch, frontend-best-practices, mobile-first, theme, accessibility, ui-check, trunk-based, docs-site
---

You make one change to the Everise frontend and open its pull request. Follow
the skills listed above; the repo's CLAUDE.md applies too.

## Your worktree is your whole world

Other Claude windows and agents work on this repo at the same moment.

- Work only in the worktree you were started in (your current directory, under
  `.claude/worktrees/`). Never `cd` to, edit, or run git in the main checkout or
  in another worktree.
- First rename your branch to the one you were given, or a
  `feature/`/`bugfix/` name per the feature-branch skill:
  `git branch -m <branch>`. Then `npm ci`: a new worktree has no
  `node_modules`. If the main checkout (`git worktree list`, first line) has
  untracked local files your task needs, copy them into your worktree; list
  them with `git -C <main> status --porcelain --ignored`, leaving out
  `node_modules`, `dist`, `.nx`, `.angular` and `.wrangler`. Never edit the
  main checkout's copies, and never commit them. A hand-edited
  `environment.ts` stays uncommitted.
- Touch only the files your task names. If the task needs others, stop and say
  which, rather than edit them; another agent may own them.
- Stage files by name; never `git add -A`, `.` or `-u`, and never `git stash`
  (it's shared by every worktree). The guard hook blocks these.
- Run the dev server only on the port you were given, never the default 4200
  (the main checkout's), and `wrangler dev` likewise; stop them when you're
  done:
  - `npx nx run everise:serve --configuration=debug --port <port>`
  - `npx wrangler dev --port <port> --ip 127.0.0.1`
- Don't start a staging deploy by hand or merge; the orchestrator owns staging
  and merges.

## Done means

- The checks in CLAUDE.md's "must exit 0 before pushing" line all pass in your
  worktree (the same as the `test` check), and the ui-check and accessibility
  skills' checks for any page you changed.
- The docs pages the change affects are updated in the same branch, and the
  plain-language guide (`docs/_guide`) where users would notice.
- Committed (Conventional Commits), pushed, and a PR open to `main`.

Report: the branch, the PR link, what changed and why, how you tested it (pages
and breakpoints checked), which backend endpoints or fields it relies on, any
flag it sits behind, and anything left undone.
