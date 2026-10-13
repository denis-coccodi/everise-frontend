import { describe, expect, it } from 'vitest';
import { headTags } from './page-meta';
import { listingIdIn, listingPage } from './listing-page';

const SITE = 'https://everise.dev';

describe("A Party Finder listing's page", () => {
  it('reads the listing id from the address', () => {
    expect(listingIdIn('/party-finder/listings/light-1789630212-1')).toBe('light-1789630212-1');
    expect(listingIdIn('/party-finder/listings/light-1789630212-1/')).toBe('light-1789630212-1');
    expect(listingIdIn('/party-finder/listings/<b>')).toBeUndefined();
    expect(listingIdIn('/party-finder/light')).toBeUndefined();
  });

  it('says what and where for link previews, never who, and stays out of search results', () => {
    const page = listingPage('chaos-1789630212-4', {
      dataCentre: 'Chaos',
      listing: {
        duty: 'The Omega Protocol (Ultimate)',
        world: { name: 'Moogle' },
        minItemLevel: 710,
        slots: [{ job: 'PLD' }, { job: null }, { job: null }],
      },
    });

    expect(page.title).toBe('The Omega Protocol (Ultimate) · Chaos Party Finder · Everise');
    expect(page.previewTitle).toBe('The Omega Protocol (Ultimate) · Chaos Party Finder');
    expect(page.description).toBe('On the Chaos Party Finder, from Moogle: 2 players needed, item level 710.');
    expect(page.path).toBe('/party-finder/listings/chaos-1789630212-4');
    expect(headTags(page, SITE)).toContain('<meta name="robots" content="noindex" />');
  });

  it('still says what the page is without the listing', () => {
    const page = listingPage('light-1789630212-1', undefined);

    expect(page.title).toBe('Party Finder listing · Everise');
    expect(page.noindex).toBe(true);
  });
});
