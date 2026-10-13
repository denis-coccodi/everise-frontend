import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Title } from '@angular/platform-browser';
import { PartyFinderListing, PartyFinderListingPage } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { PfListingPageComponent } from './pf-listing-page.component';

const ID = 'chaos-1789630212-4';

function found(changes: Partial<PartyFinderListing> = {}): PartyFinderListingPage {
  return {
    dataCentre: 'Chaos',
    fetchedAt: new Date().toISOString(),
    icons: { tank: 62581, healer: 62582, dps: 62583, beginner: 61523 },
    listing: {
      id: ID,
      recruiter: 'Tataru Taru',
      description: 'Prog from P3',
      world: { id: 71, name: 'Moogle' },
      homeWorld: { id: 71, name: 'Moogle' },
      category: 'HighEndDuty',
      duty: 'The Unending Coil of Bahamut (Ultimate)',
      dutyIcon: 61832,
      level: 70,
      sortKey: 1,
      highEnd: true,
      worldOnly: false,
      onePlayerPerJob: true,
      beginnersWelcome: false,
      minItemLevel: 0,
      objective: 'practice',
      dutyComplete: false,
      loot: 'normal',
      parties: 1,
      slots: [{ job: null, icon: null, roles: ['healer'], accepts: [{ role: 'healer', jobs: ['WHM'] }] }],
      updatedAt: new Date(Date.now() - 60000).toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
      ...changes,
    },
  };
}

describe('PfListingPageComponent', () => {
  async function render(id = ID) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        provideRouter([
          { path: 'party-finder/listings/:id', component: PfListingPageComponent },
          { path: 'party-finder', children: [] },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/party-finder/listings/${id}`);
    const http = TestBed.inject(HttpTestingController);
    const page = harness.fixture.nativeElement as HTMLElement;
    return { fixture: harness.fixture, http, page };
  }

  it('shows the listing anyone has the link to, and links back to its data centre', async () => {
    const { fixture, http, page } = await render();
    expect(page.textContent).toContain('Finding the listing…');

    http.expectOne(`/party-finder/listings/${ID}`).flush(found());
    await fixture.whenStable();

    expect(page.querySelector('h1')?.textContent).toContain('Party Finder listing');
    expect(page.querySelector('cdt-pf-listing h3')?.textContent).toContain('The Unending Coil of Bahamut (Ultimate)');
    expect(page.querySelector('.checked')?.textContent).toContain('On Chaos · checked just now');
    const back = page.querySelector('.hero a') as HTMLAnchorElement;
    expect(back.textContent).toContain('Every listing on the Chaos Party Finder');
    expect(back.getAttribute('href')).toBe('/party-finder?dc=chaos');
    expect(TestBed.inject(Title).getTitle()).toBe(
      'The Unending Coil of Bahamut (Ultimate) · Chaos Party Finder · Everise',
    );
  });

  it("says why a listing that's gone isn't there, in the backend's words, and stays on the page", async () => {
    const { fixture, http, page } = await render();

    http
      .expectOne(`/party-finder/listings/${ID}`)
      .flush(
        { errors: { body: ['This listing is no longer up on Chaos: the party filled up.'] } },
        { status: 404, statusText: 'Not Found' },
      );
    await fixture.whenStable();

    expect(page.querySelector('cdt-message')?.textContent).toContain('This listing is no longer up on Chaos');
    expect(page.querySelector('cdt-pf-listing')).toBeNull();
    // Its id names the data centre, so the way back is known.
    expect((page.querySelector('.hero a') as HTMLAnchorElement).getAttribute('href')).toBe('/party-finder?dc=chaos');
  });

  it("keeps the listing when a check fails, and says so; ends it when it's gone", async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    try {
      const { fixture, http, page } = await render();
      http.expectOne(`/party-finder/listings/${ID}`).flush(found());
      await fixture.whenStable();

      vi.advanceTimersByTime(30_000);
      http
        .expectOne(`/party-finder/listings/${ID}`)
        .flush({ errors: { body: ['Try again in a minute.'] } }, { status: 502, statusText: 'Bad Gateway' });
      await fixture.whenStable();
      expect(page.querySelector('cdt-pf-listing')).not.toBeNull();
      expect(page.querySelector('.checked')?.textContent).toContain('Try again in a minute.');

      vi.advanceTimersByTime(30_000);
      http
        .expectOne(`/party-finder/listings/${ID}`)
        .flush({ errors: { body: ['This listing is no longer up.'] } }, { status: 404, statusText: 'Not Found' });
      await fixture.whenStable();
      expect(page.querySelector('cdt-pf-listing')).toBeNull();
      expect(page.querySelector('cdt-message')?.textContent).toContain('no longer up');

      // Nothing more to check.
      vi.advanceTimersByTime(30_000);
      http.expectNone(`/party-finder/listings/${ID}`);
    } finally {
      vi.useRealTimers();
    }
  });
});
