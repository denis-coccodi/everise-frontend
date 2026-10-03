// The Worker in front of the static Angular build (see wrangler.jsonc).
//
// /api/* is forwarded to the backend Worker over a service binding (API), so the
// browser only ever talks to this site: no CORS, first-party cookies, and one
// Cloudflare Access login on staging. Everything else is a static file, with
// index.html for unknown paths (single-page-application fallback).
//
// Only /api/* reaches this script (assets.run_worker_first); the ASSETS branch
// below is a fallback in case that routing changes.

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  API: Fetcher;
  ASSETS: Fetcher;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return env.API.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
