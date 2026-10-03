---
name: smoke-test
description: Check that the Conduit frontend is served and that its /api proxy reaches the backend with working cookie auth, locally (wrangler dev or nx serve), on staging, or on production. Use when asked whether the site is up, whether a deploy worked, or to verify a change in the running app rather than in unit tests.
---

# Smoke-test the Conduit frontend

`scripts/smoke.sh` (also run by CI) drives the deployed site with curl and a cookie jar. It prints `ok`/`FAIL` per request, masks JWTs, and exits non-zero on any unexpected status or body.

- `read`: app shell (`<cdt-root`), a deep link (SPA fallback), `offline-sw.js`, and `GET /api/tags` through the proxy. Writes nothing.
- `create`: `read`, then registers a random user and reads `/api/user` back with the cookie, proving the same-origin cookie works.

```
sh scripts/smoke.sh read   <base-url>
sh scripts/smoke.sh create <base-url> <scratchpad>/jar.txt
```

## Targets

| Target                 | Base URL                                              | `create` allowed?                            |
| ---------------------- | ----------------------------------------------------- | -------------------------------------------- |
| local (`wrangler dev`) | http://localhost:4200                                 | yes                                          |
| staging                | https://conduit-web-staging.denis-coccodi.workers.dev | yes; CI already does on every push to `main` |
| production             | https://conduit-web.denis-coccodi.workers.dev         | ask the user first; `read` is always fine    |

## Local

The frontend proxies `/api` to the backend, so start the backend first, from `../typescript-cloudflare-backend`: `npx wrangler dev --port 8080` (needs its `.dev.vars`). Wait until `curl -s http://localhost:8080/api/tags` answers.

- **Production-like** (Worker + service binding): `npx nx run conduit:build --configuration=production`, then `npx wrangler dev` (port 4200). The `API` binding reaches the local backend through wrangler's dev registry; without the backend running, `/api/*` fails. Run `create` against http://localhost:4200.
- **Dev server**: `npm start` / `nx run conduit:serve` proxies `/api` to localhost:8080 (`apps/conduit/proxy.conf.json`); `npm run start:staging-api` proxies to the staging backend instead (`proxy.staging.json`). `smoke.sh` checks for the built shell, so for the dev server curl `/api/tags` directly.
- On Windows, killing a background Bash task does not always free the port. Stop it from PowerShell:
  `Get-NetTCPConnection -LocalPort 4200 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`

## Notes

- A newly created `*.workers.dev` hostname answers `404` with `error code: 1042` for up to a minute or so. Wait and retry before treating it as a failure.
- For a full browser check, run the app and drive it with Playwright (`apps/conduit-e2e`), pointing `BASE_URL` at the target.
