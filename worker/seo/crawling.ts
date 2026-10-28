// robots.txt and sitemap.xml, for search engines.

import { eventPath } from './event-pages';
import { dataCentrePage } from './party-finder-page';
import { venuePath } from './venue-pages';

// What GET /api/sitemap answers (an older backend: no venues or events).
export interface SitemapData {
  articles: { id: string; updatedAt: string }[];
  dataCentres: string[];
  venues?: string[];
  events?: number[];
}

// The pages every sitemap lists, besides posts and data centres.
const FIXED_PAGES = [
  '/',
  '/party-finder',
  '/venues',
  '/events',
  '/market-history',
  '/roulette',
  '/waking-sands',
  '/privacy',
];

// Production welcomes crawlers to everything but the API and the members'
// own pages; any other host (staging, a preview) asks them to stay away.
export function robotsTxt(siteUrl: string, production: boolean): string {
  if (!production) return 'User-agent: *\nDisallow: /\n';
  return [
    'User-agent: *',
    'Disallow: /api/',
    'Disallow: /settings',
    'Disallow: /editor',
    'Disallow: /confirm-email',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

// The site's pages; without data (the backend unreachable), the fixed ones.
// The fight planner's page once it's switched on (`planner`).
export function sitemapXml(siteUrl: string, data: SitemapData | undefined, planner = false): string {
  const entries = [
    ...FIXED_PAGES.map((path) => entry(siteUrl + path)),
    ...(planner ? [entry(siteUrl + '/planner')] : []),
    ...(data?.dataCentres ?? []).map((name) => entry(siteUrl + dataCentrePage(name))),
    ...(data?.venues ?? []).map((id) => entry(siteUrl + venuePath(id))),
    ...(data?.events ?? []).map((id) => entry(siteUrl + eventPath(id))),
    ...(data?.articles ?? []).map((article) =>
      entry(`${siteUrl}/article/${encodeURIComponent(article.id)}`, article.updatedAt),
    ),
  ];
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join('\n') +
    '\n</urlset>\n'
  );
}

function entry(url: string, lastModified?: string) {
  const date = lastModified ? `<lastmod>${new Date(lastModified).toISOString()}</lastmod>` : '';
  return `  <url><loc>${url.replace(/&/g, '&amp;')}</loc>${date}</url>`;
}
