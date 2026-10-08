// What a page tells search engines and link previews: the tags in <head>,
// and the HTML put in <cdt-root> before the app starts, which crawlers that
// don't run scripts read (the app replaces it as soon as it runs, with the
// same content, so people and crawlers see the same page).

export interface PageMeta {
  // The whole <title>, e.g. "Light Party Finder · live FFXIV listings · Everise".
  title: string;
  // The title link previews show, when not the whole <title> (a post's own).
  previewTitle?: string;
  description: string;
  // The page's address on the site, e.g. "/party-finder/light": the
  // canonical URL, whatever host or query it was opened with.
  path: string;
  type?: 'website' | 'article';
  // An absolute picture URL; the crest by default.
  image?: string;
  // Kept out of search results (sign-in pages).
  noindex?: boolean;
  // Schema.org structured data, one <script type="application/ld+json"> each.
  jsonLd?: object[];
  // Extra <meta property=…> tags, e.g. article:author.
  properties?: [string, string][];
  body?: string;
}

export const SITE_NAME = 'Everise';
export const CREST = '/assets/images/everise-crest.png';

// The <head> tags for a page on the site at `siteUrl` (https://everise.dev).
export function headTags(meta: PageMeta, siteUrl: string): string {
  const url = siteUrl + meta.path;
  const image = meta.image ?? siteUrl + CREST;
  const named: [string, string][] = [
    ['description', meta.description],
    ['twitter:card', meta.image ? 'summary_large_image' : 'summary'],
  ];
  if (meta.noindex) named.push(['robots', 'noindex']);
  const properties: [string, string][] = [
    ['og:site_name', SITE_NAME],
    ['og:type', meta.type ?? 'website'],
    ['og:url', url],
    ['og:title', meta.previewTitle ?? meta.title],
    ['og:description', meta.description],
    ['og:image', image],
    ...(meta.properties ?? []),
  ];
  return [
    `<link rel="canonical" href="${attribute(url)}" />`,
    ...named.map(([name, content]) => `<meta name="${name}" content="${attribute(content)}" />`),
    ...properties.map(([property, content]) => `<meta property="${property}" content="${attribute(content)}" />`),
    ...(meta.jsonLd ?? []).map((data) => `<script type="application/ld+json">${jsonForScript(data)}</script>`),
  ].join('');
}

// The page's words as <cdt-root> holds them until the app starts: hidden,
// so the page doesn't flash plain text before the app replaces it (with the
// same words). Crawlers that don't run the app read the HTML as it is.
export function rootContent(body: string): string {
  return `<div hidden>${body}</div>`;
}

export function attribute(value: string): string {
  return text(value).replace(/"/g, '&quot;');
}

export function text(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// JSON inside a <script>: "</script>" in a value must not end it.
function jsonForScript(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
