// Cloudflare Worker for the Conduit frontend (see wrangler.jsonc).
// Static files are served by Cloudflare's assets layer; only /api/* runs this
// code, and it is handed to the backend Worker bound as API.
export default {
  fetch(request, env) {
    return env.API.fetch(request);
  },
};
