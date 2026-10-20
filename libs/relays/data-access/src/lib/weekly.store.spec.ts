import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { WeeklyResponse } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { WeeklyStore } from './weekly.store';

const WEEK: WeeklyResponse = {
  available: true,
  resets: {
    daily: '2026-10-14T15:00:00.000Z',
    weekly: '2026-10-20T08:00:00.000Z',
    grandCompany: '2026-10-14T20:00:00.000Z',
  },
  fashionReport: null,
  nextJudgingAt: '2026-10-16T08:00:00.000Z',
  islandSanctuary: null,
};

describe('WeeklyStore', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [WeeklyStore, provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '' }],
    });
    const store = TestBed.inject(WeeklyStore);
    // The resource asks once effects run, and answers once the app is stable.
    TestBed.tick();
    const settled = () => TestBed.inject(ApplicationRef).whenStable();
    return { store, http: TestBed.inject(HttpTestingController), settled };
  }

  it('reads the week', async () => {
    const { store, http, settled } = setup();

    expect(store.weekly.isLoading()).toBe(true);
    http.expectOne('/weekly').flush(WEEK);
    await settled();

    expect(store.weekly.hasValue()).toBe(true);
    expect(store.weekly.value()).toEqual(WEEK);
  });

  it('keeps what it showed when a refresh fails, and says why', async () => {
    const { store, http, settled } = setup();
    http.expectOne('/weekly').flush(WEEK);
    await settled();
    expect(store.weekly.value()).toEqual(WEEK);

    store.load();
    TestBed.tick();
    http.expectOne('/weekly').flush({ errors: { body: ['Try again later.'] } }, { status: 503, statusText: '' });
    await settled();

    expect(store.weekly.hasValue()).toBe(true);
    expect(store.weekly.value()).toEqual(WEEK);
    expect(store.error()).toBe('Try again later.');
  });

  it("says why when the week can't be read", async () => {
    const { store, http, settled } = setup();

    http.expectOne('/weekly').flush({ errors: { body: ['Try again later.'] } }, { status: 503, statusText: '' });
    await settled();

    expect(store.weekly.status()).toBe('error');
    expect(store.weekly.value()).toBeUndefined();
    expect(store.error()).toBe('Try again later.');
  });
});
