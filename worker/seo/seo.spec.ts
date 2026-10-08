import { describe, expect, it } from 'vitest';
import { articlePage } from './article-page';
import { robotsTxt, sitemapXml } from './crawling';
import { headTags, rootContent } from './page-meta';
import { Board, dataCentreIn, partyFinderPage } from './party-finder-page';
import { staticPage } from './static-pages';

const SITE = 'https://everise.dev';
const NOW = Date.parse('2026-10-08T12:00:00Z');
const later = '2026-10-08T12:30:00Z';
const earlier = '2026-10-08T11:30:00Z';

const board: Board = {
  dataCentre: 'Light',
  worlds: [{ name: 'Odin' }, { name: 'Shiva' }],
  regions: [
    { name: 'Europe', dataCentres: ['Light', 'Chaos'] },
    { name: 'Oceania', dataCentres: ['Materia'] },
  ],
  listings: [
    { duty: 'The Omega Protocol (Ultimate)', category: 'HighEndDuty', expiresAt: later },
    { duty: 'The Omega Protocol (Ultimate)', category: 'HighEndDuty', expiresAt: later },
    { duty: 'Sastasha', category: 'Dungeon', expiresAt: later },
    { duty: 'Gone Already', category: 'Raid', expiresAt: earlier },
    { duty: null, category: 'None', expiresAt: later },
  ],
};

describe('headTags', () => {
  it('writes the canonical address, description, card tags and structured data, escaped', () => {
    const tags = headTags(
      {
        title: 'A "quoted" <title>',
        description: 'Fish & chips',
        path: '/roulette',
        jsonLd: [{ name: '</script><b>' }],
      },
      SITE,
    );

    expect(tags).toContain('<link rel="canonical" href="https://everise.dev/roulette" />');
    expect(tags).toContain('<meta name="description" content="Fish &amp; chips" />');
    expect(tags).toContain('<meta property="og:title" content="A &quot;quoted&quot; &lt;title&gt;" />');
    expect(tags).toContain(
      '<meta property="og:image" content="https://everise.dev/assets/images/everise-crest.png" />',
    );
    expect(tags).toContain('\\u003c/script>');
    expect(tags).not.toContain('</script><b>');
    expect(tags).not.toContain('noindex');
  });

  it("hides the page's words until the app replaces them, so nothing flashes", () => {
    expect(rootContent('<h1>Light Party Finder</h1>')).toBe('<div hidden><h1>Light Party Finder</h1></div>');
  });

  it('keeps sign-in pages out of search results', () => {
    expect(headTags(staticPage('/login', SITE)!, SITE)).toContain('<meta name="robots" content="noindex" />');
  });
});

describe('Party Finder pages', () => {
  it('reads the data centre from the address', () => {
    expect(dataCentreIn('/party-finder/light')).toBe('Light');
    expect(dataCentreIn('/party-finder/materia/')).toBe('Materia');
    expect(dataCentreIn('/party-finder')).toBeUndefined();
    expect(dataCentreIn('/party-finder/light/savage')).toBeUndefined();
  });

  it("a data centre's page names its worlds and what's recruiting now, never who", () => {
    const page = partyFinderPage('Light', board, SITE, NOW);

    expect(page.title).toBe('Light Party Finder · live FFXIV listings · Everise');
    expect(page.path).toBe('/party-finder/light');
    expect(page.description).toContain('the Light data centre (Europe): Odin, Shiva');
    expect(page.description).toContain('4 parties recruiting right now');
    expect(page.body).toContain('<h1>Light Party Finder</h1>');
    expect(page.body).toContain('<li>The Omega Protocol (Ultimate) (High-end Duty): 2 parties</li>');
    expect(page.body).toContain('<li>Sastasha (Dungeons): 1 party</li>');
    expect(page.body).not.toContain('Gone Already');
    expect(page.body).toContain('<a href="/party-finder/materia">Materia Party Finder</a>');
    expect(page.jsonLd).toEqual([
      expect.objectContaining({
        '@type': 'BreadcrumbList',
        itemListElement: [
          expect.objectContaining({ position: 1, item: 'https://everise.dev/party-finder' }),
          expect.objectContaining({ position: 2, name: 'Light', item: 'https://everise.dev/party-finder/light' }),
        ],
      }),
    ]);
  });

  it("the page for every data centre links to each, without one data centre's listings", () => {
    const page = partyFinderPage(undefined, board, SITE, NOW);

    expect(page.path).toBe('/party-finder');
    expect(page.description).toContain('Light, Chaos, Materia');
    expect(page.body).not.toContain('Recruiting now');
    expect(page.body).toContain('<a href="/party-finder/chaos">Chaos Party Finder</a>');
  });

  it('still says what the page is when the listings could not be read', () => {
    const page = partyFinderPage('Chaos', undefined, SITE, NOW);

    expect(page.title).toBe('Chaos Party Finder · live FFXIV listings · Everise');
    expect(page.description).toBe(
      'Live Final Fantasy XIV Party Finder listings on the Chaos data centre. Refreshed every minute, with jobs, roles and filters.',
    );
  });
});

describe('crawling', () => {
  it('production lets crawlers in, but not into the API or members-only pages, and names the sitemap', () => {
    const robots = robotsTxt(SITE, true);

    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Disallow: /settings');
    expect(robots).toContain('Sitemap: https://everise.dev/sitemap.xml');
    expect(robots).not.toMatch(/^Disallow: \/$/m);
  });

  it('staging keeps every crawler out', () => {
    expect(robotsTxt('https://staging.everise.dev', false)).toBe('User-agent: *\nDisallow: /\n');
  });

  it('the sitemap lists the fixed pages, each data centre, and every post with its last change', () => {
    const xml = sitemapXml(SITE, {
      dataCentres: ['Light', 'Chaos'],
      articles: [{ id: 'a&b', updatedAt: '2026-10-01T10:00:00.000Z' }],
    });

    expect(xml).toContain('<loc>https://everise.dev/</loc>');
    expect(xml).toContain('<loc>https://everise.dev/party-finder</loc>');
    expect(xml).toContain('<loc>https://everise.dev/party-finder/chaos</loc>');
    expect(xml).toContain(
      '<url><loc>https://everise.dev/article/a%26b</loc><lastmod>2026-10-01T10:00:00.000Z</lastmod></url>',
    );
    expect(sitemapXml(SITE, undefined)).toContain('<loc>https://everise.dev/roulette</loc>');
  });
});

describe('static and post pages', () => {
  it('the home page introduces the free company, with its links and structured data', () => {
    const home = staticPage('/home', SITE)!;

    expect(home.path).toBe('/');
    expect(home.body).toContain('<a href="/party-finder">');
    expect(home.jsonLd).toContainEqual(expect.objectContaining({ '@type': 'Organization', name: 'Everise' }));
    expect(staticPage('/settings', SITE)).toBeUndefined();
  });

  it("a shared Party Finder listing's post previews with the picture of its card", () => {
    const page = articlePage(
      {
        id: 'post-2',
        title: 'Party Finder: Dancing Mad (Ultimate)',
        description: 'Odin (Light) · 3 players needed',
        body: 'Come prog!',
        author: { username: 'Alisaie' },
        partyFinder: { picture: 'https://everise.dev/api/media/pic-1' },
      },
      SITE,
    );

    expect(page.image).toBe('https://everise.dev/api/media/pic-1');
  });

  it("a post's page has its card, its author and Article data", () => {
    const page = articlePage(
      {
        id: 'post-1',
        title: 'Savage clear!',
        description: 'Finally.',
        body: '…',
        createdAt: '2026-10-01T10:00:00.000Z',
        author: { username: 'Alisaie' },
        media: [{ kind: 'video', url: 'https://youtu.be/x', videoId: 'abc' }],
      },
      SITE,
    );
    const tags = headTags(page, SITE);

    expect(tags).toContain('<meta property="og:title" content="Savage clear!" />');
    expect(tags).toContain('<meta property="og:image" content="https://i.ytimg.com/vi/abc/hqdefault.jpg" />');
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(tags).toContain('<meta property="article:author" content="Alisaie" />');
    expect(page.title).toBe('Savage clear! · Everise');
    expect(page.jsonLd).toContainEqual(
      expect.objectContaining({
        '@type': 'Article',
        headline: 'Savage clear!',
        datePublished: '2026-10-01T10:00:00.000Z',
      }),
    );
  });
});
