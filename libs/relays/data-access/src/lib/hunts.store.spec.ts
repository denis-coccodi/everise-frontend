import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HuntsResponse } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { HUNTS_POLL_MS, HuntsStore } from './hunts.store';

const train = (id: string, dataCentre: 'Light' | 'Chaos'): HuntsResponse['posts'][number] => ({
  dataCentre,
  startsAt: '2026-10-14T12:00:00.000Z',
  message: { id, postedAt: '2026-10-14T11:50:00.000Z', sourceName: 'Hunts', content: id, embeds: [], attachments: [] },
});

describe('HuntsStore', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [HuntsStore, provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '' }],
    });
    const store = TestBed.inject(HuntsStore);
    TestBed.tick();
    const settled = () => TestBed.inject(ApplicationRef).whenStable();
    return { store, http: TestBed.inject(HttpTestingController), settled };
  }

  it('reads the hunt trains, a section per data centre in the order given (Light first)', async () => {
    const { store, http, settled } = setup();

    http.expectOne('/hunts').flush({
      available: true,
      dataCentres: ['Light', 'Chaos'],
      posts: [train('odin', 'Light'), train('cerberus', 'Chaos'), train('shiva', 'Light')],
    } satisfies HuntsResponse);
    await settled();

    expect(store.loadState()).toBe('ready');
    expect(store.sections().map((s) => [s.dataCentre, s.trains.map((t) => t.message.id)])).toEqual([
      ['Light', ['odin', 'shiva']],
      ['Chaos', ['cerberus']],
    ]);
  });

  it("says why when they can't be read", async () => {
    const { store, http, settled } = setup();

    http
      .expectOne('/hunts')
      .flush({ errors: { body: ['The hunt trains are resting.'] } }, { status: 500, statusText: '' });
    await settled();

    expect(store.loadState()).toBe('error');
    expect(store.error()).toBe('The hunt trains are resting.');
  });

  it('asks again on coming back to the tab only once the list is a poll old', async () => {
    const { store, http, settled } = setup();
    http.expectOne('/hunts').flush({ available: true, dataCentres: [], posts: [] } satisfies HuntsResponse);
    await settled();

    store.refreshIfStale();
    TestBed.tick();
    http.expectNone('/hunts');

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + HUNTS_POLL_MS);
    store.refreshIfStale();
    TestBed.tick();
    http.expectOne('/hunts');
    vi.restoreAllMocks();
  });
});
