// Local development (`npm start`, `nx serve`, `npm run start-sw`).
// Builds replace this file: `--configuration=staging` with environment.staging.ts,
// `--configuration=production` with environment.prod.ts (see apps/everise/project.json).

export const environment = {
  production: false,
  // Register offline-sw.js. Off while developing; turn on to try the offline
  // features locally (best with `npm run start-sw`, which serves a built copy).
  serviceWorker: false,
  // Local backend: `npx wrangler dev --port 8080` in ../typescript-cloudflare-backend.
  api_url: 'http://localhost:8080/api',
  // Staging backend: it is behind Cloudflare Access, so first open
  // https://staging.apis.everise.dev/api/tags in this browser and
  // log in; its CORS allows http://localhost:4200.
  // api_url: 'https://staging.apis.everise.dev/api',
  // The production backend only accepts the production site, not localhost.
  // Deployed builds use the relative '/api' (environment.staging.ts, environment.prod.ts).
  // Cloudflare Turnstile's test key, which always passes (a local backend
  // has no Turnstile secret and checks nothing). '' turns the check off.
  turnstileSiteKey: '1x00000000000000000000AA',
};
