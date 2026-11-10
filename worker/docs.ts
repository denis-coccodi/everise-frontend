// The documentation, served at this site's own address: GitHub Pages builds
// it from each repository's docs/ folder (the docs-site skill), and this
// Worker passes it through, so the site guide and the technical pages share
// the site's origin, look and links.
//   /guide/...          the site guide (the frontend's docs/_guide)
//   /docs/frontend/...  the frontend's technical pages
//   /docs/backend/...   the backend's technical pages

const PAGES = 'https://denis-coccodi.github.io';

// Where each address's pages are built, by its prefix.
const SOURCES: [prefix: string, source: string][] = [
  ['/guide/', `${PAGES}/everise-frontend/guide/`],
  ['/docs/frontend/', `${PAGES}/everise-frontend/`],
  ['/docs/backend/', `${PAGES}/everise-backend/`],
];

// How long a page is kept at the edge and in the browser.
const CACHE_SECONDS = 300;

// Whether `pathname` is the documentation's.
export function isDocs(pathname: string): boolean {
  return (
    pathname === '/guide' || pathname === '/docs' || pathname.startsWith('/guide/') || pathname.startsWith('/docs/')
  );
}

// The documentation's page at `request`'s address, from GitHub Pages.
export async function docsResponse(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  // A section without its slash, and /docs itself, go to its front page.
  if (pathname === '/guide' || pathname === '/docs/frontend' || pathname === '/docs/backend') {
    return Response.redirect(`${url.origin}${pathname}/`, 301);
  }
  if (pathname === '/docs' || pathname === '/docs/') return Response.redirect(`${url.origin}/docs/frontend/`, 301);
  const found = SOURCES.find(([prefix]) => pathname.startsWith(prefix));
  if (!found) return new Response('Not found', { status: 404 });
  const [prefix, source] = found;
  const answer = await fetcher(source + pathname.slice(prefix.length) + url.search, {
    redirect: 'manual',
    cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
  } as RequestInit);
  const headers = new Headers();
  for (const name of ['content-type', 'last-modified', 'etag']) {
    const value = answer.headers.get(name);
    if (value) headers.set(name, value);
  }
  // GitHub Pages adds a missing slash with a redirect to its own address.
  const location = answer.headers.get('location');
  if (location) headers.set('location', siteAddress(location, url.origin) ?? location);
  headers.set('cache-control', `public, max-age=${CACHE_SECONDS}`);
  return new Response(answer.body, { status: answer.status, headers });
}

// A GitHub Pages address as this site's, or null for anywhere else.
function siteAddress(location: string, origin: string): string | null {
  for (const [prefix, source] of SOURCES) {
    if (location.startsWith(source)) return origin + prefix + location.slice(source.length);
  }
  return null;
}
