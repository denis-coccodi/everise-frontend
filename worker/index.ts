// The Worker in front of the static Angular build (see wrangler.jsonc).
//
// /api/* is forwarded to the backend Worker over a service binding (API), so the
// browser only ever talks to this site: no CORS, first-party cookies, and one
// Cloudflare Access login on staging. Everything else is a static file, with
// index.html for unknown paths (single-page-application fallback).
//
// A post's page (/article/<slug>) also passes through here, so a link to it
// pasted in Discord (or anywhere that reads Open Graph tags) shows a card with
// the post's title, description and picture: the app itself only fills those
// in after it runs, which link previews never wait for.
//
// Only /api/* and /article/* reach this script (assets.run_worker_first); the
// ASSETS branch below is a fallback in case that routing changes.

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  API: Fetcher;
  ASSETS: Fetcher;
}

// Cloudflare's streaming HTML editor, available in every Worker.
interface HtmlElement {
  setInnerContent(content: string): void;
  append(content: string, options: { html: boolean }): void;
  remove(): void;
}
interface HtmlRewriter {
  on(selector: string, handlers: { element(element: HtmlElement): void }): HtmlRewriter;
  transform(response: Response): Response;
}
declare const HTMLRewriter: { new (): HtmlRewriter };

// A post as GET /api/articles/:slug returns it (the parts the card uses).
interface Article {
  slug: string;
  title: string;
  description: string;
  body: string;
  author: { username: string };
  roulette?: { type: string; name: string; detail: string; image: number | null };
}

const ARTICLE_PAGE = /^\/article\/([^/]+)\/?$/;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return env.API.fetch(request);
    }

    const article = ARTICLE_PAGE.exec(pathname);
    if (article && request.method === 'GET') {
      return articlePage(request, env, decodeURIComponent(article[1]));
    }

    return env.ASSETS.fetch(request);
  },
};

// The app's page, with the post's card tags in its <head>. If the post can't
// be read, the page is served as it is.
async function articlePage(request: Request, env: Env, slug: string): Promise<Response> {
  const origin = new URL(request.url).origin;
  const page = await env.ASSETS.fetch(new Request(`${origin}/`, { headers: request.headers }));
  if (!page.ok) return page;

  let article: Article | undefined;
  try {
    const answer = await env.API.fetch(
      new Request(`${origin}/api/articles/${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json' } }),
    );
    if (answer.ok) article = ((await answer.json()) as { article: Article }).article;
  } catch {
    // Served without the card.
  }
  if (!article) return page;
  const post = article;

  return new HTMLRewriter()
    .on('title', { element: (title) => title.setInnerContent(`${post.title} · Everise`) })
    .on('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"]', {
      element: (meta) => meta.remove(),
    })
    .on('head', { element: (head) => head.append(cardOf(post, origin), { html: true }) })
    .transform(page);
}

function cardOf(article: Article, origin: string): string {
  const url = `${origin}/article/${encodeURIComponent(article.slug)}`;
  const roulette = article.roulette;
  const description = roulette
    ? `${roulette.type}: ${roulette.name}${roulette.detail ? ` · ${roulette.detail}` : ''}. ${article.description}`
    : article.description;
  // The roulette's duty banner, else the post's first image, else the crest.
  const picture = roulette?.image
    ? `${origin}/api/images/${roulette.image}`
    : /!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/.exec(article.body)?.[1] ?? null;
  const tags: [string, string, string][] = [
    ['name', 'description', description],
    ['property', 'og:site_name', 'Everise'],
    ['property', 'og:type', 'article'],
    ['property', 'og:url', url],
    ['property', 'og:title', article.title],
    ['property', 'og:description', description],
    ['property', 'og:image', picture ?? `${origin}/assets/images/everise-crest.png`],
    ['property', 'article:author', article.author.username],
    ['name', 'twitter:card', picture ? 'summary_large_image' : 'summary'],
  ];
  return tags.map(([key, name, content]) => `<meta ${key}="${name}" content="${attribute(content)}" />`).join('');
}

function attribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
