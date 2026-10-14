import { renderMarket } from '../market-page-testing';

describe('MarketComponent', () => {
  it('tells guests what it does and how to get in, without reading the market', async () => {
    const { page, http } = await renderMarket('/market-history', { signedIn: false });

    expect(page.querySelector('h1')?.textContent).toBe('Market History');
    expect(page.querySelector('.pitch')?.textContent).toContain('The cheapest listing now.');
    const links = [...page.querySelectorAll('.actions a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(links).toEqual([
      ['Sign in', '/login'],
      ['Sign up', '/register'],
    ]);
    expect(page.querySelector('cdt-market-tool')).toBeNull();
    http.expectNone(() => true);
  });

  it('gives members the tool', async () => {
    const { page } = await renderMarket();

    expect(page.querySelector('cdt-market-tool')).not.toBeNull();
    expect(page.querySelector('.pitch')).toBeNull();
  });

  it.each([true, false])('thanks Universalis and XIVAPI, for everyone (signed in: %s)', async (signedIn) => {
    const { page } = await renderMarket('/market-history', { signedIn });

    const credits = page.querySelector('.credits');
    expect(credits?.textContent).toContain('thank you to it and to everyone who uploads');
    expect([...(credits?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href'))).toEqual([
      'https://universalis.app',
      'https://v2.xivapi.com',
    ]);
  });
});
