import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
    return { store: TestBed.inject(WeeklyStore), http: TestBed.inject(HttpTestingController) };
  }

  it('reads the week', () => {
    const { store, http } = setup();

    http.expectOne('/weekly').flush(WEEK);

    expect(store.loadState()).toBe('ready');
    expect(store.weekly()).toEqual(WEEK);
  });

  it('keeps what it showed when a refresh fails, and says why', () => {
    const { store, http } = setup();
    http.expectOne('/weekly').flush(WEEK);

    store.load();
    http.expectOne('/weekly').flush({ errors: { body: ['Try again later.'] } }, { status: 503, statusText: '' });

    expect(store.loadState()).toBe('ready');
    expect(store.weekly()).toEqual(WEEK);
    expect(store.error()).toBe('Try again later.');
  });
});
