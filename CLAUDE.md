# Working in this repo

- Every change goes through a `feature/<name>` branch and a pull request to `main`, merged once the `test` check passes. Follow the `feature-branch` skill before the first edit.
- Merging to `main` deploys staging automatically. Production is deployed by hand (`deploy` skill); never start it unless asked.
- `npx nx run-many -t lint test && npx nx run everise:build --configuration=production && npx nx run everise:build --configuration=staging` must exit 0 before pushing (the same as the `test` check).
- The site looks like Final Fantasy XIV, and the whole look lives in `apps/everise/src/styles.scss`. Components use its role tokens (`var(--color-…)`, `var(--font-…)`, …) and shared classes (`.xiv-panel`, `.btn-primary`, …), never raw colours, fonts or shadows. Follow the `theme` skill before touching any template or style.
- Deployed builds call the relative `/api`, which `worker/index.ts` forwards to the environment's backend Worker (`../typescript-cloudflare-backend`) over the service binding in `wrangler.jsonc`. `environment.ts` is the local dev build, calls a backend directly, and is meant to be edited by hand. See the `deploy` skill.
