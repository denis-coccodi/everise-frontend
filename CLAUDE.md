# Working in this repo

- Every change goes through a `feature/<name>` branch and a pull request to `main`, merged once the `test` check passes. Follow the `feature-branch` skill before the first edit.
- Merging to `main` deploys staging automatically. Production is deployed by hand (`deploy` skill); never start it unless asked.
- `npx nx run-many -t lint test && npx nx run everise:build --configuration=production && npx nx run everise:build --configuration=staging` must exit 0 before pushing (the same as the `test` check).
- The site looks like Final Fantasy XIV. The UI library (`libs/ui/components`, `@realworld/ui/components`) defines the theme (`src/theme`, loaded once by `apps/everise/src/styles.scss`) and the dumb, themed building blocks: `cdtButton`, `cdtInput`, `<cdt-checkbox>`, `<cdt-panel>`, `<cdt-dialog>`, `cdtTabs`/`cdtTab`, `cdtTag`, `<cdt-pager>`. Features reuse those and never write control classes, raw colours, fonts or shadows; a new kind of control goes into the UI library first. Follow the `theme` skill before touching any template or style.
- Deployed builds call the relative `/api`, which `worker/index.ts` forwards to the environment's backend Worker (`../typescript-cloudflare-backend`) over the service binding in `wrangler.jsonc`. `environment.ts` is the local dev build, calls a backend directly, and is meant to be edited by hand. See the `deploy` skill.
