---
name: smoke-test
description: Check that the Conduit frontend is served, was built with the right configuration, and that its /api reaches the backend through the service binding (cookie auth included), locally (wrangler dev), on staging, or on production. Use when asked whether the site is up, whether a deploy worked, or to verify a change in the running app rather than in unit tests.
---

# Smoke-test the Conduit frontend

`scripts/smoke.sh` (also run by CI) checks a running frontend with curl and a cookie jar. The site forwards `/api/*` to its backend Worker over a service binding, so the API is tested through `<frontend-url>/api`. It prints `ok`/`FAIL` per check, masks JWTs, and exits non-zero on any unexpected status or body.

- `read`: app shell (`<cdt-root`), a deep link (SPA fallback), `offline-sw.js`, the default avatar (`/assets/images/avatar-profile.png` is an image); that a script in the deployed bundle sets `api_url` to `/api` (catches a dev build deployed by mistake); and `GET /api/tags` answered by the backend, not by the SPA fallback. Writes nothing.
- `create`: `read`, then registers a random user and reads `/api/user` back with the cookie.

```
sh scripts/smoke.sh read   <frontend-url>
sh scripts/smoke.sh create <frontend-url> <scratchpad>/jar.txt
```

`BUNDLE_API=http://localhost:8080/api` makes the bundle check expect a dev build instead.

## Targets

| Target                 | Frontend URL                                          | `create` allowed?                                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| local (`wrangler dev`) | http://localhost:4200                                 | yes                                                                                                                                                                                                              |
| staging                | https://conduit-web-staging.denis-coccodi.workers.dev | yes; CI already does on every merge to `main`. Behind Cloudflare Access: export `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET` (a service token the user holds) or every check gets a `302` to the Access login |
| production             | https://conduit-web.denis-coccodi.workers.dev         | ask the user first; `read` is always fine                                                                                                                                                                        |

## Local

The service binding works locally too: `wrangler dev` connects to another `wrangler dev` session of the bound Worker on the same machine.

1. Start the backend from `../typescript-cloudflare-backend`: `npx wrangler dev --port 8080` (needs its `.dev.vars`). Wait until `curl -s http://localhost:8080/api/tags` answers.
2. Build and serve the frontend: `npx nx run conduit:build --configuration=production`, then `npx wrangler dev` (port 4200). Its `/api` goes to the local backend (binding `API` → `conduit`).
   - A staging build with `npx wrangler dev --env staging` binds to `conduit-staging`, so start the backend with `npx wrangler dev --env staging --port 8080` instead.
3. `sh scripts/smoke.sh create http://localhost:4200 <scratchpad>/jar.txt`.

- The dev server (`npm start`) uses `environment.ts` and calls the backend directly; there is no built shell or binding to check.
- On Windows, stopping a background Bash task can leave `wrangler`'s node process and its `workerd.exe` children running (they then lock `node_modules`). Stop them from PowerShell:
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? { $_.CommandLine -match 'node_modules\\wrangler' } | % { Stop-Process -Id $_.ProcessId -Force }; Get-Process workerd -ErrorAction SilentlyContinue | Stop-Process -Force`

## Notes

- A newly created `*.workers.dev` hostname answers `404` with `error code: 1042` for up to a minute or so. Wait and retry before treating it as a failure.
- `GET /api/tags` returning the app shell (HTML) instead of JSON means `/api/*` is not reaching the Worker script: check `assets.run_worker_first` in `wrangler.jsonc`. A `5xx` from `/api` usually means the bound backend Worker does not exist under that name.
- For a full browser check, run the app and drive it with Playwright (`apps/conduit-e2e`), pointing `BASE_URL` at the target.
