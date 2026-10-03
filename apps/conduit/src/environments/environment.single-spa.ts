// Used by build-single-spa: mounted inside the hub, a relative /api would hit the
// hub's origin, so the API is addressed directly (cross-origin; the backend's
// CORS_ORIGINS must list the hub's origin).
export const environment = {
  production: false,
  api_url: 'https://conduit.denis-coccodi.workers.dev/api',
};
