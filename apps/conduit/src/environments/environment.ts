// Local development (`npm start`, `nx serve`, `npm run start-sw`).
// Builds replace this file: `--configuration=staging` with environment.staging.ts,
// `--configuration=production` with environment.prod.ts (see apps/conduit/project.json).

export const environment = {
  production: false,
  // Register offline-sw.js. Off while developing; turn on to try the offline
  // features locally (best with `npm run start-sw`, which serves a built copy).
  serviceWorker: false,
  // Local backend: `npx wrangler dev --port 8080` in ../typescript-cloudflare-backend.
  api_url: 'http://localhost:8080/api',
  // Staging backend:
  // api_url: 'https://conduit-staging.denis-coccodi.workers.dev/api',
  // Production backend:
  // api_url: 'https://conduit.denis-coccodi.workers.dev/api',
};
