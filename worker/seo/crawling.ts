// robots.txt and sitemap.xml, for search engines.

// What GET /api/sitemap answers.
export interface SitemapData {
  articles: { id: string; updatedAt: string }[];
  dataCentres: string[];
}

// The pages every sitemap lists, besides posts and data centres.
const FIXED_PAGES = ['/', '/party-finder', '/roulette', '/waking-sands', '/privacy'];

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
export function sitemapXml(siteUrl: string, data: SitemapData | undefined): string {
  const entries = [
    ...FIXED_PAGES.map((path) => entry(siteUrl + path)),
    ...(data?.dataCentres ?? []).map((name) => entry(`${siteUrl}/party-finder/${name.toLowerCase()}`)),
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
