import { describe, expect, it } from 'vitest';
import { sitemapXml } from './crawling';
import { plannerPage } from './planner-page';
import { staticPage } from './static-pages';

const SITE = 'https://everise.dev';

describe('the fight planner, for search engines', () => {
  it('has a page of its own, and a report opened in it stays out of search results', () => {
    const page = plannerPage(new URL(`${SITE}/planner`));

    expect(page.title).toBe('FFXIV fight planner · heals and mitigations from FFLogs · Everise');
    expect(page.path).toBe('/planner');
    expect(page.noindex).toBeUndefined();
    expect(page.body).toContain('<h1>Fight planner</h1>');

    const report = plannerPage(new URL(`${SITE}/planner?report=aBcD1234&pull=3`));
    expect(report.noindex).toBe(true);
    // Its canonical page is the planner itself.
    expect(report.path).toBe('/planner');
  });

  it('is in the sitemap and linked from the home page only once switched on', () => {
    const data = { articles: [], dataCentres: [] };

    expect(sitemapXml(SITE, data)).not.toContain('/planner');
    expect(sitemapXml(SITE, data, true)).toContain('<loc>https://everise.dev/planner</loc>');
    expect(staticPage('/', SITE)!.body).not.toContain('/planner');
    expect(staticPage('/', SITE, { planner: true })!.body).toContain('<a href="/planner">');
  });
});
