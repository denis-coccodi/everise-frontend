import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MarketHistory, MarketItem, MarketRegions } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { daysBefore, today } from './market-series';
import { MARKET_POLL_MS, MarketStore } from './market.store';

const ORE: MarketItem = { id: 5111, name: 'Iron Ore', icon: 21202, canBeHq: false, category: 'Stone' };

const REGIONS: MarketRegions = {
  defaultRegion: 'europe',
  homeWorld: 'Odin',
  historyStart: '2022-10-01',
  regions: [
    {
      id: 'europe',
      name: 'Europe',
      dataCentres: [
        {
          name: 'Light',
          worlds: ['Alpha', 'Lich', 'Odin', 'Phoenix', 'Raiden', 'Shiva', 'Twintania', 'Zodiark'].map((name, i) => ({
            id: i + 1,
            name,
          })),
        },
        { name: 'Chaos', worlds: [{ id: 71, name: 'Moogle' }] },
      ],
    },
    { id: 'oceania', name: 'Oceania', dataCentres: [{ name: 'Materia', worlds: [{ id: 22, name: 'Bismarck' }] }] },
  ],
};

const TODAY = today();

// Odin (3) and Phoenix (4) sold today; Phoenix for less.
function history(region = 'europe', complete = true): MarketHistory {
  const day = (median: number) => ({ day: TODAY, median, min: median, max: median, sales: 1, quantity: 1 });
  return {
    region: { id: region, name: region },
    item: ORE.id,
    quality: 'all',
    from: daysBefore(TODAY, 30),
    complete,
    refreshedAt: null,
    worlds:
      region === 'oceania'
        ? [{ id: 22, days: [day(100)] }]
        : [
            { id: 3, days: [day(300)] },
            { id: 4, days: [day(250)] },
          ],
  };
}

describe('MarketStore', () => {
  function setUp() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '' }, MarketStore],
    });
    const store = TestBed.inject(MarketStore);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/market/regions').flush(REGIONS);
    const histories = () => http.match((r) => r.url === '/market/history');
    return { store, http, histories };
  }
  const param = (req: TestRequest, name: string) => req.request.params.get(name);

  afterEach(() => vi.useRealTimers());

  it("reads the item picked over the last month, and draws the home world and today's cheapest", () => {
    const { store, histories } = setUp();

    store.pick(ORE);
    const [req] = histories();
    expect([param(req, 'region'), param(req, 'item'), param(req, 'from')]).toEqual([
      'europe',
      '5111',
      daysBefore(TODAY, 30),
    ]);
    req.flush(history());

    expect(store.series().map((s) => s.world.name)).toEqual(['Odin', 'Phoenix']);
    expect(store.lowestToday()).toMatchObject({ median: 250, world: { name: 'Phoenix' } });
    expect(store.lowestShown()).toMatchObject({ median: 250, world: { name: 'Phoenix' } });
  });

  it("adds Oceania's worlds when asked", () => {
    const { store, histories } = setUp();
    store.pick(ORE);
    histories()[0].flush(history());

    store.setOceania(true);
    const [europe, oceania] = histories();
    expect([param(europe, 'region'), param(oceania, 'region')]).toEqual(['europe', 'oceania']);
    europe.flush(history());
    oceania.flush(history('oceania'));

    expect(store.lowestToday()).toMatchObject({ median: 100, world: { name: 'Bismarck' } });
    expect(store.allWorlds().map((w) => w.name)).toContain('Bismarck');
  });

  it('draws the worlds picked, up to 8', () => {
    const { store, histories } = setUp();
    store.pick(ORE);
    histories()[0].flush(history());

    store.toggleWorld('odin');
    expect(store.chosen().map((w) => w.key)).toEqual(['phoenix']);
    for (const key of ['alpha', 'lich', 'odin', 'raiden', 'shiva', 'twintania', 'zodiark', 'moogle']) {
      store.toggleWorld(key);
    }
    expect(store.chosen()).toHaveLength(8);
    expect(store.chosen().map((w) => w.key)).not.toContain('moogle');
    expect(histories()).toEqual([]);
  });

  it('reads again from an earlier first day, but draws a later last day without asking', () => {
    const { store, histories } = setUp();
    store.pick(ORE);
    histories()[0].flush(history());

    store.setRange('2026-01-01', null);
    const [req] = histories();
    expect(param(req, 'from')).toBe('2026-01-01');
    req.flush(history());

    store.setRange('2026-01-01', '2026-06-01');
    expect(histories()).toEqual([]);
    expect(store.range()).toEqual({ from: '2026-01-01', to: '2026-06-01' });

    store.setRange('2001-01-01', null);
    expect(store.range().from).toBe('2022-10-01');
  });

  it('asks again while older days are still coming in', () => {
    vi.useFakeTimers();
    const { store, histories } = setUp();

    store.pick(ORE);
    histories()[0].flush(history('europe', false));
    expect(store.reading()).toBe(true);

    vi.advanceTimersByTime(MARKET_POLL_MS);
    histories()[0].flush(history('europe', true));
    expect(store.reading()).toBe(false);

    vi.advanceTimersByTime(MARKET_POLL_MS * 3);
    expect(histories()).toEqual([]);
  });

  it("says when the history can't be read", () => {
    const { store, histories } = setUp();
    store.pick(ORE);
    histories()[0].flush(
      { errors: { body: ["The market board's history can't be read right now. Try again in a minute."] } },
      { status: 502, statusText: 'Bad Gateway' },
    );

    expect(store.error()).toBe("The market board's history can't be read right now. Try again in a minute.");
    expect(store.loadState()).toBe('error');
  });
});
