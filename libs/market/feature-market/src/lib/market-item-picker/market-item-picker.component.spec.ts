import { INGOT, ORE, history, renderMarket, renderOre } from '../market-page-testing';

describe('MarketItemPickerComponent', () => {
  it('searches as you type, and shows the item picked, in the link', async () => {
    const { fixture, http, page, query } = await renderMarket();
    const search = page.querySelector('#market-search') as HTMLInputElement;
    expect(page.querySelector('label[for="market-search"]')?.textContent).toContain('Find an item');

    // The search waits for the typing to stop.
    vi.useFakeTimers();
    try {
      search.value = 'iron';
      search.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);
    } finally {
      vi.useRealTimers();
    }
    http
      .expectOne((r) => r.url === '/market/items' && r.params.get('search') === 'iron')
      .flush({ items: [ORE, INGOT] });
    await fixture.whenStable();

    expect(page.querySelector('[aria-live="polite"]')?.textContent).toBe('2 items found.');
    const results = [...page.querySelectorAll('.results button')] as HTMLButtonElement[];
    expect(results.map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Iron Ore Stone',
      'Iron Ingot Metal',
    ]);

    results[0].click();
    http.expectOne((r) => r.url === '/market/history' && r.params.get('item') === '5111').flush(history());
    await fixture.whenStable();
    expect(query()['item']).toBe('5111');
    expect(search.value).toBe('');
    expect(document.activeElement).toBe(search);
    expect(page.querySelector('.shown')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Iron Ore Stone');
  });

  it("names the item a link shows, and says when nothing's found", async () => {
    const { fixture, http, page } = await renderOre();
    expect(page.querySelector('label[for="market-search"]')?.textContent).toContain('Find another item');

    const search = page.querySelector('#market-search') as HTMLInputElement;
    vi.useFakeTimers();
    try {
      search.value = 'zzz';
      search.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);
    } finally {
      vi.useRealTimers();
    }
    http.expectOne((r) => r.url === '/market/items').flush({ items: [] });
    await fixture.whenStable();
    expect(page.querySelector('.notice')?.textContent).toBe('No item the market board sells has that name.');
  });
});
