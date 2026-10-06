// Production: `nx build everise --configuration=production`, deployed to
// https://everise.dev. The site forwards /api to the
// production backend over a service binding (wrangler.jsonc, worker/index.ts).
export const environment = {
  production: true,
  serviceWorker: true,
  api_url: '/api',
};
