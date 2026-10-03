---
name: smoke-test
description: Check that the Conduit frontend is served, was built for the right backend, and that the backend accepts it (CORS with credentials, cookie auth), locally (wrangler dev), on staging, or on production. Use when asked whether the site is up, whether a deploy worked, or to verify a change in the running app rather than in unit tests.
---

# Smoke-test the Conduit frontend

`scripts/smoke.sh` (also run by CI) checks a running frontend and the backend it was built for, with curl and a cookie jar. It prints `ok`/`FAIL` per check, masks JWTs, and exits non-zero on any unexpected status or body.

- `read`: app shell (`<cdt-root`), a deep link (SPA fallback), `offline-sw.js`; that a script in the deployed bundle sets `api_url` to `<api-url>` (catches a build made with the wrong configuration); `GET <api-url>/tags`; and that the backend answers the frontend's origin with `Access-Control-Allow-Origin` + `Allow-Credentials`, for a GET and a `POST /users` preflight. Writes nothing.
- `create`: `read`, then registers a random user and reads `/user` back with the cookie, sending the frontend's `Origin`.

```
sh scripts/smoke.sh read   <frontend-url> <api-url>
sh scripts/smoke.sh create <frontend-url> <api-url> <scratchpad>/jar.txt
```

curl does not enforce `SameSite` or third-party cookie blocking, so `create` passing does not prove a browser keeps the session; see the `deploy` skill on cross-site cookies.

## Targets

| Target                 | Frontend URL                                          | API URL                                                   | `create` allowed?                            |
| ---------------------- | ----------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------- |
| local (`wrangler dev`) | http://localhost:4200                                 | http://localhost:8080/api (or what `environment.ts` says) | yes                                          |
| staging                | https://conduit-web-staging.denis-coccodi.workers.dev | https://conduit-staging.denis-coccodi.workers.dev/api     | yes; CI already does on every push to `main` |
| production             | https://conduit-web.denis-coccodi.workers.dev         | https://conduit.denis-coccodi.workers.dev/api             | ask the user first; `read` is always fine    |

## Local

1. Start the backend from `../typescript-cloudflare-backend`: `npx wrangler dev --port 8080` (needs its `.dev.vars`). Wait until `curl -s http://localhost:8080/api/tags` answers.
2. Build and serve the frontend: `npx nx run conduit:build --configuration=<debug|staging|production>`, then `npx wrangler dev` (port 4200). `debug` uses `environment.ts` (local backend); `staging` calls the real staging backend, which allows `http://localhost:4200`, so this tests a staging build before deploying it.
3. Run `create` with the matching API URL.

- The dev server (`npm start`) has no built shell to check; curl the API directly instead.
- On Windows, stopping a background Bash task can leave `wrangler`'s node process and its `workerd.exe` children running (they then lock `node_modules`). Stop them from PowerShell:
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? { $_.CommandLine -match 'node_modules\\wrangler' } | % { Stop-Process -Id $_.ProcessId -Force }; Get-Process workerd -ErrorAction SilentlyContinue | Stop-Process -Force`

## Notes

- A newly created `*.workers.dev` hostname answers `404` with `error code: 1042` for up to a minute or so. Wait and retry before treating it as a failure.
- For a full browser check, run the app and drive it with Playwright (`apps/conduit-e2e`), pointing `BASE_URL` at the target.
