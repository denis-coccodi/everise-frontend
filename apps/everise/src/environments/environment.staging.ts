// Staging: `nx build everise --configuration=staging`, deployed to
// https://staging.everise.dev. The site forwards /api to
// the staging backend over a service binding (wrangler.jsonc, worker/index.ts).
export const environment = {
  production: true,
  // Off: the offline mode served stale data (feature/service-worker-off).
  serviceWorker: false,
  api_url: '/api',
  // Cloudflare Turnstile's site key (public; the secret is the backend's).
  turnstileSiteKey: '0x4AAAAAAFROIj4bDEEExZyj',
};
