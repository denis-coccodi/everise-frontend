// Production: `nx build everise --configuration=production`, deployed to
// https://everise.dev. The site forwards /api to the
// production backend over a service binding (wrangler.jsonc, worker/index.ts).
export const environment = {
  production: true,
  api_url: '/api',
  // Cloudflare Turnstile's site key (public; the secret is the backend's).
  turnstileSiteKey: '0x4AAAAAAFROIj4bDEEExZyj',
  // Cloudflare Web Analytics' site token for everise.dev (public); main.ts
  // loads its beacon. The results: Cloudflare dashboard > Web Analytics.
  webAnalyticsToken: '6f486eb5b8e942649ab2ca94caf5e3cf',
};
