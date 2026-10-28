import { describe, expect, it } from 'vitest';
import { articlePage } from './article-page';
import { sitemapXml } from './crawling';
import { eventPage, eventsPage } from './event-pages';
import { staticPage } from './static-pages';
import { venuePage, venuesDataCentreIn, venuesPage } from './venue-pages';

const SITE = 'https://everise.dev';

const venue = {
  id: '03SsBX8Q1dkl',
  name: 'The Heretic Knight',
  description: ['An Ishgardian tavern.', 'Memories last.'],
  banner: 'https://images.ffxivvenues.com/03SsBX8Q1dkl/banner',
  world: 'Shiva',
  address: 'Goblet, Ward 25, Plot 48',
  tags: ['Tavern', 'Bards'],
};

const event = {
  id: 56133,
  title: 'Club <Noir>',
  summary: 'Bring a date.',
  startsAt: '2026-10-29T20:00:00.000Z',
  endsAt: '2026-10-30T00:00:00.000Z',
  dataCentre: 'Chaos',
  world: 'Omega',
  location: 'Empyreum, Ward 30, Plot 52',
  tags: ['Live DJs'],
  banner: 'https://cdn.partake.gg/banner.webp',
  team: { name: 'Club Noir' },
  url: 'https://www.partake.gg/events/56133',
};

describe('Venues and Events pages', () => {
  it("the Venues page links each of the data centre's venues, at ?dc= but for Light", () => {
    const page = venuesPage('Chaos', { dataCentre: 'Chaos', venues: [venue] });

    expect(page.path).toBe('/venues?dc=chaos');
    expect(page.body).toContain('<a href="/venues/03SsBX8Q1dkl">The Heretic Knight</a> · Shiva');
    expect(venuesPage('Light', undefined).path).toBe('/venues');
    expect(venuesDataCentreIn(new URL(`${SITE}/venues?dc=chaos`))).toBe('Chaos');
    expect(venuesDataCentreIn(new URL(`${SITE}/venues`))).toBe('Light');
  });

  it("a venue's page says where it is, what it is, and its week's events, with Place data", () => {
    const page = venuePage({ venue: { ...venue, dataCentre: 'Light' }, events: [{ id: 7, title: 'Open mic' }] }, SITE);

    expect(page.title).toBe('The Heretic Knight · Shiva · FFXIV venue · Everise');
    expect(page.path).toBe('/venues/03SsBX8Q1dkl');
    expect(page.image).toBe(venue.banner);
    expect(page.body).toContain('<p>Goblet, Ward 25, Plot 48, Shiva, Light</p>');
    expect(page.body).toContain('<a href="/events/7">Open mic</a>');
    expect(page.body).toContain('<a href="/venues">More venues on Light</a>');
    expect(page.jsonLd).toContainEqual(expect.objectContaining({ '@type': 'Place', name: 'The Heretic Knight' }));
  });

  it("the Events page links each of the week's events", () => {
    const page = eventsPage({ events: [event] });

    expect(page.path).toBe('/events');
    expect(page.body).toContain('<a href="/events/56133">Club &lt;Noir&gt;</a> · Omega');
  });

  it("an event's page says when and where, its description without pictures, its venue, and Event data", () => {
    const page = eventPage(
      {
        event: { ...event, description: '![](https://cdn.partake.gg/a.webp)\n\n## Tonight\n\nDance.' },
        venue: { id: '03SsBX8Q1dkl', name: 'The Heretic Knight' },
      },
      SITE,
    );

    expect(page.body).toContain('<h1>Club &lt;Noir&gt;</h1>');
    expect(page.body).toContain('<p>2026-10-29 20:00 UTC · Empyreum, Ward 30, Plot 52, Omega, Chaos</p>');
    expect(page.body).toContain('<p>## Tonight</p><p>Dance.</p>');
    expect(page.body).not.toContain('a.webp');
    expect(page.body).toContain('At <a href="/venues/03SsBX8Q1dkl">The Heretic Knight</a>');
    expect(page.jsonLd).toContainEqual(
      expect.objectContaining({ '@type': 'Event', startDate: event.startsAt, endDate: event.endsAt }),
    );
  });

  it('the sitemap lists Venues, Events and their pages', () => {
    const xml = sitemapXml(SITE, { articles: [], dataCentres: [], venues: ['03SsBX8Q1dkl'], events: [56133] });

    expect(xml).toContain('<loc>https://everise.dev/venues</loc>');
    expect(xml).toContain('<loc>https://everise.dev/events</loc>');
    expect(xml).toContain('<loc>https://everise.dev/venues/03SsBX8Q1dkl</loc>');
    expect(xml).toContain('<loc>https://everise.dev/events/56133</loc>');
  });

  it('the home page links to Venues and Events', () => {
    const home = staticPage('/', SITE)!;

    expect(home.body).toContain('<a href="/venues">');
    expect(home.body).toContain('<a href="/events">');
  });
});

describe('thin posts', () => {
  const post = (body: string) =>
    articlePage(
      { id: 'p', title: 'Duty Found: Sastasha', description: 'Dungeons', body, author: { username: 'Tataru' } },
      SITE,
    );

  it('keeps a post with little text of its own out of search results, not one with some', () => {
    expect(post('').noindex).toBe(true);
    expect(post('Short and sweet.').noindex).toBe(true);
    expect(
      post('A proper write-up of the run, how the pulls went and what we learned. '.repeat(2)).noindex,
    ).toBeUndefined();
  });
});
