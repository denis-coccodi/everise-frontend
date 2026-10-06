// Staging: `nx build everise --configuration=staging`, deployed to
// https://staging.everise.dev. The site forwards /api to
// the staging backend over a service binding (wrangler.jsonc, worker/index.ts).
export const environment = {
  production: true,
  serviceWorker: true,
  api_url: '/api',
};
