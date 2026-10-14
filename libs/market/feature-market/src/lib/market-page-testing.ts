// The market history page in tests: its fixtures, and the page as the app
// routes it.
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthStore } from '@everise/auth/data-access';
import { MarketHistory, MarketItem, MarketRegions, User } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { daysBefore, today } from '@everise/market/data-access';
import { MarketComponent } from './market/market.component';

export const ORE: MarketItem = { id: 5111, name: 'Iron Ore', icon: 21202, canBeHq: false, category: 'Stone' };
export const INGOT: MarketItem = { id: 5057, name: 'Iron Ingot', icon: 20801, canBeHq: true, category: 'Metal' };

export const ODIN = 66;
export const PHOENIX = 56;
export const MOOGLE = 71;
export const BISMARCK = 22;

export const REGIONS: MarketRegions = {
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
            { id: ODIN, name: 'Odin' },
            { id: PHOENIX, name: 'Phoenix' },
            { id: 67, name: 'Shiva' },
          ],
        },
        { name: 'Chaos', worlds: [{ id: MOOGLE, name: 'Moogle' }] },
      ],
    },
    { id: 'north-america', name: 'North America', dataCentres: [] },
    {
      id: 'oceania',
      name: 'Oceania',
      dataCentres: [{ name: 'Materia', worlds: [{ id: BISMARCK, name: 'Bismarck' }] }],
    },
  ],
};

export const TODAY = today();
export const day = (days: number) => daysBefore(TODAY, days);

// The item's history: Odin and Phoenix sold today (Phoenix for less) and
// ten days ago; Moogle sold twenty days ago, for least.
export function history(region = 'europe', complete = true): MarketHistory {
  const sold = (date: string, median: number, sales = 1) => ({
    day: date,
    median,
    min: median - 10,
    max: median + 10,
    sales,
    quantity: sales,
  });
  return {
    region: { id: region, name: region },
    item: ORE.id,
    quality: 'all',
    from: day(30),
    complete,
    refreshedAt: null,
    worlds:
      region === 'oceania'
        ? [{ id: BISMARCK, days: [sold(TODAY, 100)] }]
        : [
            { id: ODIN, days: [sold(day(10), 320), sold(TODAY, 300, 4)] },
            { id: PHOENIX, days: [sold(day(10), 280), sold(TODAY, 250, 2)] },
            { id: MOOGLE, days: [sold(day(20), 200)] },
          ],
  };
}

// The page as the app routes it, at `url`, for a signed-in member (the
// tool, with the regions read) or a guest.
export async function renderMarket(url = '/market-history', { signedIn = true } = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '' },
      provideRouter([{ path: 'market-history', component: MarketComponent }]),
    ],
  });
  if (signedIn) TestBed.inject(AuthStore).confirmed({ id: 'u1', username: 'Tataru' } as User);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const fixture = harness.fixture;
  const http = TestBed.inject(HttpTestingController);
  if (signedIn) {
    http.expectOne('/market/regions').flush(REGIONS);
  } else {
    // A guest: the app asks who's signed in, and nobody is.
    TestBed.inject(AuthStore).getUser();
    http.expectOne('/user').flush({ errors: { body: ['Sign in'] } }, { status: 401, statusText: 'Unauthorized' });
  }
  await fixture.whenStable();
  const page = fixture.nativeElement as HTMLElement;
  const query = () => TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).queryParams;
  return { fixture, http, page, query };
}

// The page showing ORE from a link: its item and history read.
export async function renderOre(url = `/market-history?item=${ORE.id}`) {
  const rendered = await renderMarket(url);
  rendered.http.expectOne(`/market/items/${ORE.id}`).flush({ item: ORE });
  rendered.http.expectOne((r) => r.url === '/market/history').flush(history());
  await rendered.fixture.whenStable();
  return rendered;
}
