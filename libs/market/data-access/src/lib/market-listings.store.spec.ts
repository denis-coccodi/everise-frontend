import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MarketItem, MarketListings, MarketRegions } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { MarketListingsStore } from './market-listings.store';
import { MarketStore } from './market.store';

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
          worlds: [
            { id: 66, name: 'Odin' },
            { id: 56, name: 'Phoenix' },
          ],
        },
      ],
    },
    { id: 'oceania', name: 'Oceania', dataCentres: [{ name: 'Materia', worlds: [{ id: 22, name: 'Bismarck' }] }] },
  ],
};

function answer(region: string, prices: [number, number][]): MarketListings {
  return {
    region: { id: region, name: region },
    item: ORE.id,
    quality: 'all',
    updatedAt: null,
    listings: prices.map(([world, price]) => ({
      world,
      price,
      quantity: 1,
      hq: false,
      reviewedAt: '2026-10-14T10:00:00.000Z',
    })),
  };
}

describe('MarketListingsStore', () => {
  it("reads the cheapest listings for the item shown, and Oceania's too, the cheapest first", async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        MarketStore,
        MarketListingsStore,
      ],
    });
    const market = TestBed.inject(MarketStore);
    const store = TestBed.inject(MarketListingsStore);
    const http = TestBed.inject(HttpTestingController);
    const settle = () => TestBed.inject(ApplicationRef).whenStable();
    http.expectOne('/market/regions').flush(REGIONS);
    await settle();
    http.expectNone((r) => r.url === '/market/listings');

    market.pick(ORE);
    await settle();
    const req = http.expectOne((r) => r.url === '/market/listings');
    expect([req.request.params.get('region'), req.request.params.get('item')]).toEqual(['europe', '5111']);
    req.flush(
      answer('europe', [
        [56, 9],
        [66, 10],
      ]),
    );
    expect(store.cheapest().map((l) => `${l.place.name} ${l.price}`)).toEqual(['Phoenix 9', 'Odin 10']);

    market.setOceania(true);
    await settle();
    const [europe, oceania] = http.match((r) => r.url === '/market/listings');
    europe.flush(answer('europe', [[56, 9]]));
    oceania.flush(answer('oceania', [[22, 7]]));
    expect(store.cheapest().map((l) => `${l.place.name} ${l.price}`)).toEqual(['Bismarck 7', 'Phoenix 9']);

    // Another day shown changes nothing here.
    market.setRange('2026-01-01', null);
    await settle();
    http.expectNone((r) => r.url === '/market/listings');
  });
});
