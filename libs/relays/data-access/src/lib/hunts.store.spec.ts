import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HuntsResponse } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { HuntsStore } from './hunts.store';

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
    return { store, http: TestBed.inject(HttpTestingController) };
  }

  it('reads the hunt trains, a section per data centre in the order given (Light first)', () => {
    const { store, http } = setup();

    http.expectOne('/hunts').flush({
      available: true,
      dataCentres: ['Light', 'Chaos'],
      posts: [train('odin', 'Light'), train('cerberus', 'Chaos'), train('shiva', 'Light')],
    } satisfies HuntsResponse);

    expect(store.loadState()).toBe('ready');
    expect(store.sections().map((s) => [s.dataCentre, s.trains.map((t) => t.message.id)])).toEqual([
      ['Light', ['odin', 'shiva']],
      ['Chaos', ['cerberus']],
    ]);
  });

  it("says why when they can't be read", () => {
    const { store, http } = setup();

    http
      .expectOne('/hunts')
      .flush({ errors: { body: ['The hunt trains are resting.'] } }, { status: 500, statusText: '' });

    expect(store.loadState()).toBe('error');
    expect(store.error()).toBe('The hunt trains are resting.');
  });
});
