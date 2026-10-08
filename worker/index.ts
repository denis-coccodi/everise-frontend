// The Worker in front of the static Angular build (see wrangler.jsonc).
//
// /api/* is forwarded to the backend Worker over a service binding (API), so the
// browser only ever talks to this site: no CORS, first-party cookies, and one
// Cloudflare Access login on staging. Everything else is a static file, with
// index.html for unknown paths (single-page-application fallback).
//
// The pages search engines and link previews read also pass through here:
// their <head> gets the page's own title, description, canonical address,
// card tags and structured data, and <cdt-root> the page's words as plain
// HTML (worker/seo). The app only fills those in after it runs, which link
// previews never wait for and not every crawler does. robots.txt and
// sitemap.xml are written here too.
//
// Only the paths in assets.run_worker_first reach this script; the ASSETS
// branch below is a fallback in case that routing changes.

import { Article, articlePage } from './seo/article-page';
import { SitemapData, robotsTxt, sitemapXml } from './seo/crawling';
import { PageMeta, headTags, rootContent } from './seo/page-meta';
import { Board, dataCentreIn, partyFinderPage } from './seo/party-finder-page';
import { staticPage } from './seo/static-pages';

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  API: Fetcher;
  ASSETS: Fetcher;
  // The site's address, for canonical URLs: https://everise.dev.
  SITE_URL: string;
  // "allow" in production; anything else keeps search engines away.
  SEARCH_ENGINES?: string;
}

// Cloudflare's streaming HTML editor, available in every Worker.
interface HtmlElement {
  setInnerContent(content: string, options?: { html: boolean }): void;
  append(content: string, options: { html: boolean }): void;
  remove(): void;
}
interface HtmlRewriter {
  on(selector: string, handlers: { element(element: HtmlElement): void }): HtmlRewriter;
  transform(response: Response): Response;
}
declare const HTMLRewriter: { new (): HtmlRewriter };

const ARTICLE_PAGE = /^\/article\/([^/]+)\/?$/;
// How long a page waits for the Party Finder before it's sent without it.
const BOARD_WAIT_MS = 1500;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return env.API.fetch(request);
    }

    const indexable = env.SEARCH_ENGINES === 'allow';
    let response: Response;
    if (pathname === '/robots.txt') {
      response = textResponse(robotsTxt(env.SITE_URL, indexable), 'text/plain');
    } else if (pathname === '/sitemap.xml') {
      response = textResponse(
        sitemapXml(env.SITE_URL, await apiJson<SitemapData>(request, env, '/sitemap')),
        'application/xml',
      );
    } else if (request.method === 'GET') {
      const meta = await pageMeta(request, env, pathname);
      response = meta ? await withMeta(request, env, meta) : await env.ASSETS.fetch(request);
    } else {
      response = await env.ASSETS.fetch(request);
    }

    if (indexable) return response;
    // Staging and previews never end up in search results.
    const kept = new Response(response.body, response);
    kept.headers.set('X-Robots-Tag', 'noindex');
    return kept;
  },
};

// What the page at `pathname` says about itself, or undefined to serve the
// app as it is.
async function pageMeta(request: Request, env: Env, pathname: string): Promise<PageMeta | undefined> {
  const article = ARTICLE_PAGE.exec(pathname);
  if (article) {
    // The post's id, or the slug an old link used.
    const key = encodeURIComponent(decodeURIComponent(article[1]));
    const answer = await apiJson<{ article: Article }>(request, env, `/articles/${key}`);
    return answer && articlePage(answer.article, env.SITE_URL);
  }
  const dataCentre = dataCentreIn(pathname);
  if (dataCentre || pathname === '/party-finder' || pathname === '/party-finder/') {
    // The regions come with any data centre's board; Light is Everise's.
    const board = await apiJson<Board>(
      request,
      env,
      `/party-finder?dataCentre=${dataCentre ?? 'Light'}`,
      BOARD_WAIT_MS,
    );
    return partyFinderPage(dataCentre, board, env.SITE_URL, Date.now());
  }
  return staticPage(pathname.replace(/(.)\/$/, '$1'), env.SITE_URL);
}

// The app's page with the page's tags in its <head> and its words in
// <cdt-root>, which the app replaces when it starts.
async function withMeta(request: Request, env: Env, meta: PageMeta): Promise<Response> {
  const origin = new URL(request.url).origin;
  const page = await env.ASSETS.fetch(new Request(`${origin}/`, { headers: request.headers }));
  if (!page.ok) return page;
  const rewriter = new HTMLRewriter()
    .on('title', { element: (title) => title.setInnerContent(meta.title) })
    .on('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"]', {
      element: (tag) => tag.remove(),
    })
    .on('head', { element: (head) => head.append(headTags(meta, env.SITE_URL), { html: true }) });
  const body = meta.body;
  if (body) rewriter.on('cdt-root', { element: (root) => root.setInnerContent(rootContent(body), { html: true }) });
  return rewriter.transform(page);
}

// An answer from the backend, or undefined when it fails or takes longer
// than `waitMs`: the page is then sent without it.
async function apiJson<T>(request: Request, env: Env, path: string, waitMs?: number): Promise<T | undefined> {
  const origin = new URL(request.url).origin;
  const read = (async () => {
    try {
      const answer = await env.API.fetch(
        new Request(`${origin}/api${path}`, { headers: { Accept: 'application/json' } }),
      );
      return answer.ok ? ((await answer.json()) as T) : undefined;
    } catch {
      return undefined;
    }
  })();
  if (!waitMs) return read;
  return Promise.race([read, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), waitMs))]);
}

function textResponse(body: string, type: string): Response {
  return new Response(body, {
    headers: { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'public, max-age=3600' },
  });
}
