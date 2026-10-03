// Production: `nx build conduit --configuration=production`, deployed to
// https://conduit-web.denis-coccodi.workers.dev. The site forwards /api to the
// production backend over a service binding (wrangler.jsonc, worker/index.ts).
export const environment = {
  production: true,
  serviceWorker: true,
  api_url: '/api',
};
