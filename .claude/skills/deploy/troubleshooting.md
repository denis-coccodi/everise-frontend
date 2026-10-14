# Deploy troubleshooting: known failure causes

What has gone wrong before, and how it was fixed. Read when a pipeline run, a deploy or the smoke test fails.

- **Missing secrets**: the deploy step fails with "it's necessary to set a CLOUDFLARE_API_TOKEN". Fix on GitHub, then `gh run rerun --failed`.
- **Smoke test: `no bundle script contains api_url "/api" after 60s`**: a dev build was deployed. Rebuild with the environment's configuration and redeploy. (Right after a deploy Cloudflare serves the previous build for a few seconds; the check retries for up to `BUNDLE_WAIT` seconds, default 60, to ride that out.)
- **Smoke test: `GET /api/tags via the frontend` returns HTML**: `/api/*` is not reaching `worker/index.ts`; check `assets.run_worker_first` in `wrangler.jsonc`. **5xx from `/api`**: the bound backend Worker is missing or failing; check it with the backend's `smoke-test` skill.
- **Staging smoke test gets `302` to `*.cloudflareaccess.com`**: Cloudflare Access rejected CI. The `CI service token` (Service Auth) policy must be on the `staging` Access application; check Zero Trust → Applications → its Policies tab (it can differ from the Worker's Access tab), and the `CF_ACCESS_CLIENT_*` repository secrets.
- **Smoke test gets `404` / `error code: 1042`**: a brand-new `workers.dev` hostname is not live yet. Only on a Worker's first deploy; re-run the job after a minute.
- **API calls return 5xx but the shell loads**: the backend is failing; check it with the backend's `smoke-test` skill.
- **Users see an old version after deploy**: a hard reload fixes it. A browser that kept the old offline worker (from before October 2026) may still serve a cached copy when a request fails; unregistering it in the browser's site settings (or clearing the site data) removes it.
- **Free-plan caps**: daily request limits are shared by all Workers on the account.
