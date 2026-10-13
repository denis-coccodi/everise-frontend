import { INGOT, ORE, history, renderMarket } from '../market-page-testing';

describe('MarketComponent', () => {
  it('asks for an item before there is anything to draw', async () => {
    const { page, http } = await renderMarket();

    expect(page.querySelector('h1')?.textContent).toBe('Market Board');
    expect(page.textContent).toContain('Add an item to see its price history.');
    http.expectNone((r) => r.url === '/market/history');
  });

  it('draws the items and place a link names, from the start of their history', async () => {
    const { fixture, http, page } = await renderMarket('/market?items=5111,5057&scope=odin');

    http.expectOne('/market/items/5111,5057').flush({ items: [ORE, INGOT] });
    const req = http.expectOne((r) => r.url === '/market/history');
    expect(req.request.params.get('items')).toBe('5111,5057');
    expect(req.request.params.get('scope')).toBe('odin');
    req.flush(history([5111, 5057]));
    await fixture.whenStable();

    const legend = [...page.querySelectorAll('cdt-line-chart .legend li .name')].map((n) => n.textContent);
    expect(legend).toEqual(['Iron Ore', 'Iron Ingot']);
    expect((page.querySelector('#market-from') as HTMLInputElement).value).toBe('2023-01-02');
    expect((page.querySelector('#market-from') as HTMLInputElement).min).toBe('2023-01-02');
    expect(page.querySelector('[role="slider"]')?.getAttribute('aria-valuetext')).toBe(
      '2 January 2026: Iron Ore 10,222 gil (1 sale, 5,111–15,333); Iron Ingot 10,114 gil (1 sale, 5,057–15,171)',
    );
  });

  it('says so while older sales are still coming in, and asks again', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    try {
      const { fixture, http, page } = await renderMarket('/market?items=5111');
      http.expectOne('/market/items/5111').flush({ items: [ORE] });
      http.expectOne((r) => r.url === '/market/history').flush(history([5111], false));
      await fixture.whenStable();
      expect(page.textContent).toContain('Reading older sales from Universalis… back to 2 January 2023 so far.');

      vi.advanceTimersByTime(4000);
      http.expectOne((r) => r.url === '/market/history').flush(history([5111], true));
      await fixture.whenStable();
      expect(page.textContent).not.toContain('Reading older sales');
    } finally {
      vi.useRealTimers();
    }
  });

  it("says when the prices can't be read", async () => {
    const { fixture, http, page } = await renderMarket('/market?items=5111');
    http.expectOne('/market/items/5111').flush({ items: [ORE] });
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
});
