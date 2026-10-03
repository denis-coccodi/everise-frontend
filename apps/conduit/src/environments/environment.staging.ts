// Staging: `nx build conduit --configuration=staging`, deployed to
// https://conduit-web-staging.denis-coccodi.workers.dev.
export const environment = {
  production: true,
  serviceWorker: true,
  api_url: 'https://conduit-staging.denis-coccodi.workers.dev/api',
};
