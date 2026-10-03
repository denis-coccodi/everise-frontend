export const environment = {
  production: true,
  // Same-origin: the frontend Worker forwards /api to the backend of its environment
  // (staging or production, see wrangler.jsonc), so one build serves both.
  api_url: '/api',
};
