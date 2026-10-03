// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `nx build conduit --configuration=production` then `environment.prod.ts` will be used instead.

export const environment = {
  production: false,
  // Same-origin: `nx serve` proxies /api to the backend (apps/conduit/proxy.conf.json:
  // local `wrangler dev` on :8080, or proxy.staging.json with --configuration=staging).
  api_url: '/api',
};
