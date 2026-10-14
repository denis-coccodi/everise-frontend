import { ORE, day, history, renderMarket, renderOre } from '../market-page-testing';

describe('MarketComponent', () => {
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
    const lowest = [...page.querySelectorAll('.lowest dd')].map((dd) => dd.textContent?.replace(/\s+/g, ' ').trim());
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
      expect(page.textContent).toContain('Reading older sales from Universalis');

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

  it('breaks a line over days without sales', async () => {
    const { page } = await renderOre();

    // Odin sold ten days ago and today: two points apart, so two dots, no line.
    expect(page.querySelectorAll('cdt-line-chart polyline')).toHaveLength(0);
    expect(page.querySelectorAll('cdt-line-chart .dot.line-0:not(.marker)')).toHaveLength(2);
  });
});
