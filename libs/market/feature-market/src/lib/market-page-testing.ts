// The market page in tests: its fixtures, and the page as the app routes it.
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MarketHistory, MarketItem } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { MarketComponent } from './market/market.component';

export const ORE: MarketItem = { id: 5111, name: 'Iron Ore', icon: 21202, canBeHq: false, category: 'Stone' };
export const INGOT: MarketItem = { id: 5057, name: 'Iron Ingot', icon: 20801, canBeHq: true, category: 'Metal' };

export const SCOPES = {
  defaultScope: 'odin',
  regions: [
    {
      name: 'Europe',
      dataCentres: [
        {
          id: 'light',
          name: 'Light',
          worlds: [
            { id: 'odin', name: 'Odin' },
            { id: 'shiva', name: 'Shiva' },
          ],
        },
      ],
    },
  ],
};

export function history(ids: number[], complete = true): MarketHistory {
  return {
    scope: { id: 'odin', name: 'Odin', kind: 'world' },
    quality: 'all',
    items: ids.map((id) => ({
      id,
      complete,
      refreshedAt: null,
      days: [
        { day: '2023-01-02', median: id, min: id - 10, max: id + 10, sales: 4, quantity: 9 },
        { day: '2026-01-02', median: id * 2, min: id, max: id * 3, sales: 1, quantity: 1 },
      ],
    })),
  };
}

// The page as the app routes it, at `url`.
export async function renderMarket(url = '/market') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '' },
      provideRouter([{ path: 'market', component: MarketComponent }]),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const fixture = harness.fixture;
  const http = TestBed.inject(HttpTestingController);
  http.expectOne('/market/scopes').flush(SCOPES);
  await fixture.whenStable();
  const page = fixture.nativeElement as HTMLElement;
  const query = () => TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).queryParams;
  return { fixture, http, page, query };
}
