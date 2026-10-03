# Working in this repo

- Every change goes through a `feature/<name>` branch and a pull request to `main`, merged once the `test` check passes. Follow the `feature-branch` skill before the first edit.
- Merging to `main` deploys staging automatically. Production is deployed by hand (`deploy` skill); never start it unless asked.
- `npx nx run conduit:build --configuration=production` must exit 0 before pushing.
- The API is `/api` on the frontend's own origin, forwarded to the backend Worker (`../typescript-cloudflare-backend`); see the `deploy` skill.
