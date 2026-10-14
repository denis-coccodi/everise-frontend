import { ODIN, ORE, PHOENIX, day, history, renderMarket, renderOre } from '../market-page-testing';

describe('MarketToolComponent', () => {
  it('asks for an item before there is anything to draw', async () => {
    const { page, http } = await renderMarket();

    expect(page.querySelector('h1')?.textContent).toBe('Market History');
    expect(page.textContent).toContain('Find an item to see its price history.');
    http.expectNone((r) => r.url === '/market/history');
  });

  it("draws the home world and today's cheapest over the last month, with the lowest prices", async () => {
    const { page, http } = await renderMarket(`/market-history?item=${ORE.id}`);
    http.expectOne(`/market/items/${ORE.id}`).flush({ item: ORE });
    const req = http.expectOne((r) => r.url === '/market/history');
    expect(req.request.params.get('region')).toBe('europe');
    expect(req.request.params.get('from')).toBe(day(30));
    req.flush(history());
    await new Promise((resolve) => setTimeout(resolve));

    const legend = [...page.querySelectorAll('cdt-line-chart .legend li .name')].map((n) => n.textContent);
    expect(legend).toEqual(['Odin', 'Phoenix']);
    const lowest = [...page.querySelectorAll('.lowest > div:not(.now) dd')].map(
      (dd) => dd.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(lowest[0]).toBe('250 gil on Phoenix (Light)');
    expect(lowest[1]).toMatch(/^200 gil on Moogle \(Chaos\), \d+ \w+ \d{4}$/);
    expect(page.querySelector('.shown .name')?.textContent).toBe('Iron Ore');
  });

  it('says so while older sales are still coming in, and asks again', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    try {
      const { fixture, http, page } = await renderMarket(`/market-history?item=${ORE.id}`);
      http.expectOne(`/market/items/${ORE.id}`).flush({ item: ORE });
      http.expectOne((r) => r.url === '/market/history').flush(history('europe', false));
      await fixture.whenStable();
      expect(page.textContent).toContain('Reading older sales from Universalis… every world back to');

      vi.advanceTimersByTime(4000);
      http.expectOne((r) => r.url === '/market/history').flush(history());
      await fixture.whenStable();
      expect(page.textContent).not.toContain('Reading older sales');
    } finally {
      vi.useRealTimers();
    }
  });

  it("says when the prices can't be read", async () => {
    const { fixture, http, page } = await renderMarket(`/market-history?item=${ORE.id}`);
    http.expectOne(`/market/items/${ORE.id}`).flush({ item: ORE });
    http
      .expectOne((r) => r.url === '/market/history')
      .flush(
        { errors: { body: ["The market board's history can't be read right now. Try again in a minute."] } },
        { status: 502, statusText: 'Bad Gateway' },
      );
    await fixture.whenStable();

    expect(page.querySelector('cdt-message[tone="error"]')?.textContent).toContain(
      "The market board's history can't be read right now.",
    );
    expect(page.textContent).toContain("The prices couldn't be read. Try again in a minute.");
  });

  it('shows the cheapest listing now on any world of the region, and the next ones', async () => {
    const { fixture, http, page } = await renderOre();
    const req = http.expectOne((r) => r.url === '/market/listings');
    expect([req.request.params.get('region'), req.request.params.get('item')]).toEqual(['europe', '5111']);
    const seen = new Date(Date.now() - 3 * 3_600_000).toISOString();
    req.flush({
      region: { id: 'europe', name: 'Europe' },
      item: ORE.id,
      quality: 'all',
      updatedAt: null,
      listings: [
        { world: PHOENIX, price: 9, quantity: 20, hq: false, reviewedAt: seen },
        { world: ODIN, price: 10, quantity: 1, hq: true, reviewedAt: seen },
      ],
    });
    await fixture.whenStable();

    const text = (selector: string) =>
      [...page.querySelectorAll(selector)].map((element) => element.textContent?.replace(/\s+/g, ' ').trim());
    expect(text('.now dt')).toEqual(['Cheapest listing now']);
    expect(text('.now > dd')[0]).toBe('9 gil on Phoenix (Light) 20 for sale, seen 3 h ago');
    expect(text('.now .next li')).toEqual(['10 gil on Odin (1 for sale, HQ, seen 3 h ago)']);
  });

  it('breaks a line over days without sales', async () => {
    const { page } = await renderOre();

    // Odin sold ten days ago and today: two points apart, so two dots, no line.
    expect(page.querySelectorAll('cdt-line-chart polyline')).toHaveLength(0);
    expect(page.querySelectorAll('cdt-line-chart .dot.line-0:not(.marker)')).toHaveLength(2);
  });
});
