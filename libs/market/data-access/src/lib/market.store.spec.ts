import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MarketHistory, MarketItem } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { MARKET_POLL_MS, MarketStore, SEARCH_DELAY_MS } from './market.store';

const ore: MarketItem = { id: 5111, name: 'Iron Ore', icon: 21202, canBeHq: false, category: 'Stone' };
const ingot: MarketItem = { id: 5057, name: 'Iron Ingot', icon: 20801, canBeHq: true, category: 'Metal' };

function history(ids: number[], complete = true): MarketHistory {
  return {
    scope: { id: 'odin', name: 'Odin', kind: 'world' },
    quality: 'all',
    items: ids.map((id) => ({
      id,
      complete,
      refreshedAt: null,
      days: [{ day: '2024-01-01', median: id, min: id, max: id, sales: 1, quantity: 1 }],
    })),
  };
}

describe('MarketStore', () => {
  function setUp() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '' }, MarketStore],
    });
    const store = TestBed.inject(MarketStore);
    const http = TestBed.inject(HttpTestingController);
    const settle = () => TestBed.inject(ApplicationRef).whenStable();
    http.expectOne('/market/scopes').flush({ regions: [], defaultScope: 'odin' });
    return { store, http, settle };
  }

  afterEach(() => vi.useRealTimers());

  it('searches items once the typing stops, from 2 letters', async () => {
    vi.useFakeTimers();
    const { store, http } = setUp();

    store.search('i');
    vi.advanceTimersByTime(SEARCH_DELAY_MS);
    http.expectNone((req) => req.url === '/market/items');

    store.search('ir');
    store.search('iron');
    vi.advanceTimersByTime(SEARCH_DELAY_MS);
    const req = http.expectOne((r) => r.url === '/market/items');
    expect(req.request.params.get('search')).toBe('iron');
    req.flush({ items: [ore, ingot] });

    expect(store.results()).toEqual([ore, ingot]);
    expect(store.searchState()).toBe('done');
  });

  it('reads the history of the items picked, up to 3, each once', () => {
    const { store, http } = setUp();

    store.add(ore);
    const first = http.expectOne((r) => r.url === '/market/history');
    expect(first.request.params.get('items')).toBe('5111');
    expect(first.request.params.get('scope')).toBe('odin');
    first.flush(history([5111]));
    expect(store.series().map((s) => s.name)).toEqual(['Iron Ore']);

    store.add(ore);
    http.expectNone((r) => r.url === '/market/history');

    store.add(ingot);
    http
      .expectOne((r) => r.url === '/market/history' && r.params.get('items') === '5111,5057')
      .flush(history([5111, 5057]));
    store.add({ ...ore, id: 2, name: 'Fire Shard' });
    http.expectOne((r) => r.url === '/market/history').flush(history([5111, 5057, 2]));
    expect(store.full()).toBe(true);

    store.add({ ...ore, id: 3, name: 'Lightning Shard' });
    http.expectNone((r) => r.url === '/market/history');

    store.remove(5057);
    http.expectOne((r) => r.params.get('items') === '5111,2').flush(history([5111, 2]));
    expect(store.items()).toEqual([5111, 2]);
  });

  it('asks again while older days are still coming in', async () => {
    vi.useFakeTimers();
    const { store, http } = setUp();

    store.add(ore);
    http.expectOne((r) => r.url === '/market/history').flush(history([5111], false));
    expect(store.reading()).toBe(true);

    vi.advanceTimersByTime(MARKET_POLL_MS);
    http.expectOne((r) => r.url === '/market/history').flush(history([5111], true));
    expect(store.reading()).toBe(false);

    vi.advanceTimersByTime(MARKET_POLL_MS * 3);
    http.expectNone((r) => r.url === '/market/history');
  });

  it('keeps the days shown within the history, the whole of it by default', () => {
    const { store, http } = setUp();
    store.add(ore);
    http
      .expectOne((r) => r.url === '/market/history')
      .flush({
        ...history([5111]),
        items: [
          {
            id: 5111,
            complete: true,
            refreshedAt: null,
            days: [
              { day: '2022-11-02', median: 1, min: 1, max: 1, sales: 1, quantity: 1 },
              { day: '2024-01-01', median: 2, min: 2, max: 2, sales: 1, quantity: 1 },
            ],
          },
        ],
      });

    expect(store.range().from).toBe('2022-11-02');
    store.setRange('2020-01-01', null);
    expect(store.from()).toBeNull();
    expect(store.range().from).toBe('2022-11-02');

    store.setRange('2023-06-01', '2023-12-31');
    expect(store.range()).toEqual({ from: '2023-06-01', to: '2023-12-31' });
    expect(store.series()[0].points).toEqual([]);
    http.expectNone((r) => r.url === '/market/history');
  });

  it("reads again for another place or quality, and says when the backend can't", () => {
    const { store, http } = setUp();
    store.add(ore);
    http.expectOne((r) => r.url === '/market/history').flush(history([5111]));

    store.setScope('light');
    http.expectOne((r) => r.params.get('scope') === 'light').flush(history([5111]));
    store.setQuality('hq');
    http
      .expectOne((r) => r.params.get('quality') === 'hq')
      .flush(
        { errors: { body: ["The market board's history can't be read right now. Try again in a minute."] } },
        { status: 502, statusText: 'Bad Gateway' },
      );

    expect(store.error()).toBe("The market board's history can't be read right now. Try again in a minute.");
    expect(store.loadState()).toBe('error');
  });
});
