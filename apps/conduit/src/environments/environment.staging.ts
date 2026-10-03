// Staging: `nx build conduit --configuration=staging`, deployed to
// https://staging.everisefc.workers.dev. The site forwards /api to
// the staging backend over a service binding (wrangler.jsonc, worker/index.ts).
export const environment = {
  production: true,
  serviceWorker: true,
  api_url: '/api',
};
