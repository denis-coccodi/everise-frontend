import { history, INGOT, ORE, renderMarket } from '../market-page-testing';

describe('MarketItemPickerComponent', () => {
  it('searches as you type, adds the item picked to the link, and removes it', async () => {
    const { fixture, http, page, query } = await renderMarket();
    const search = page.querySelector('#market-search') as HTMLInputElement;

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
    http.expectOne((r) => r.url === '/market/history').flush(history([5111]));
    await fixture.whenStable();
    expect(query()['items']).toBe('5111');
    expect(search.value).toBe('');
    expect(document.activeElement).toBe(search);
    expect(page.querySelector('.picked')?.textContent).toContain('Iron Ore');

    (page.querySelector('.picked button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(query()['items']).toBeUndefined();
    expect(page.querySelector('.picked')).toBeNull();
  });

  it('takes no more than 3 items', async () => {
    const { fixture, http, page } = await renderMarket('/market?items=5111,5057,2');
    http.expectOne('/market/items/5111,5057,2').flush({ items: [ORE, INGOT] });
    http.expectOne((r) => r.url === '/market/history').flush(history([5111, 5057, 2]));
    await fixture.whenStable();

    expect(page.querySelector('#market-search')).toBeNull();
    expect(page.textContent).toContain('3 items is the most a chart compares: remove one to add another.');
    const removes = [...page.querySelectorAll('.picked button')].map((b) => b.getAttribute('aria-label'));
    expect(removes).toEqual(['Remove Iron Ore', 'Remove Iron Ingot', 'Remove item 2']);
  });
});
