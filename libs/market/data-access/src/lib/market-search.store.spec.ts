import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MarketItem } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { MarketSearchStore, SEARCH_DELAY_MS } from './market-search.store';

const ORE: MarketItem = { id: 5111, name: 'Iron Ore', icon: 21202, canBeHq: false, category: 'Stone' };

describe('MarketSearchStore', () => {
  afterEach(() => vi.useRealTimers());

  it('searches items once the typing stops, from 2 letters, and says when it fails', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        MarketSearchStore,
      ],
    });
    const store = TestBed.inject(MarketSearchStore);
    const http = TestBed.inject(HttpTestingController);

    store.search('i');
    vi.advanceTimersByTime(SEARCH_DELAY_MS);
    http.expectNone((r) => r.url === '/market/items');

    store.search('ir');
    store.search('iron');
    vi.advanceTimersByTime(SEARCH_DELAY_MS);
    const req = http.expectOne((r) => r.url === '/market/items');
    expect(req.request.params.get('search')).toBe('iron');
    req.flush({ items: [ORE] });
    expect(store.results()).toEqual([ORE]);
    expect(store.state()).toBe('done');

    store.search('iron o');
    vi.advanceTimersByTime(SEARCH_DELAY_MS);
    http
      .expectOne((r) => r.url === '/market/items')
      .flush(
        { errors: { body: ["The game's items can't be searched right now. Try again in a minute."] } },
        { status: 502, statusText: 'Bad Gateway' },
      );
    expect(store.state()).toBe('error');
    expect(store.error()).toBe("The game's items can't be searched right now. Try again in a minute.");
  });
});
