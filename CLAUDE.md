# Working in this repo

- Every change goes through a `feature/<name>` branch and a pull request to `main`, merged once the `test` check passes. Follow the `feature-branch` skill before the first edit.
- Merging to `main` deploys staging automatically. Production is deployed by hand (`deploy` skill); never start it unless asked.
- `npx nx run-many -t lint test && npx nx run conduit:build --configuration=production && npx nx run conduit:build --configuration=staging` must exit 0 before pushing (the same as the `test` check).
- Each environment calls its own backend (`../typescript-cloudflare-backend`), set in `apps/conduit/src/environments/` and picked by the build configuration (`staging`, `production`); `environment.ts` is local and meant to be edited by hand. See the `deploy` skill.
