import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL } from '@everise/core/http-client';
import { venueList as list } from '../venue-fixtures';
import { VenuesComponent } from './venues.component';

describe('VenuesComponent', () => {
  async function render(url = '/venues') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        provideRouter([{ path: 'venues', component: VenuesComponent }]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    const fixture = harness.fixture;
    const http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const names = (section: string) =>
      [...page.querySelectorAll(`section[aria-labelledby=${section}] h3`)].map((h) => h.textContent?.trim());
    return { harness, fixture, http, page, names };
  }

  it("shows Light's venues, those open now apart from the rest", async () => {
    const { fixture, http, page, names } = await render();

    expect(page.querySelector('.notice')?.textContent).toContain('Finding venues on Light');
    http.expectOne('/venues?dataCentre=Light').flush(list());
    await fixture.whenStable();

    expect(page.querySelector('h1')?.textContent).toBe('Venues');
    expect(page.querySelector('#venues-open')?.textContent).toBe('Open now on Light');
    expect(names('venues-open')).toEqual(['Venue open']);
    expect(names('venues-later')).toEqual(['Venue soon', 'Venue later']);
    expect(page.querySelector('.source a')?.getAttribute('href')).toBe('https://ffxivvenues.com');
  });

  it("shows another data centre's venues from its link, marking it current", async () => {
    const { harness, fixture, http, page } = await render('/venues?dc=chaos');
    http.expectOne('/venues?dataCentre=Chaos').flush(list({ dataCentre: 'Chaos' }));
    await fixture.whenStable();

    const current = page.querySelector('cdt-venue-data-centres a[aria-current=page]');
    expect(current?.textContent?.trim()).toBe('Chaos');

    await harness.navigateByUrl('/venues?dc=materia');
    http.expectOne('/venues?dataCentre=Materia').flush(list({ dataCentre: 'Materia', venues: [] }));
    await fixture.whenStable();

    const empty = page.querySelector('.state') as HTMLElement;
    expect(empty.querySelector('h2')?.textContent?.trim()).toBe('No venues on Materia this week yet');
    expect(empty.querySelector('a')?.getAttribute('href')).toBe('https://ffxivvenues.com');
  });

  it("says why the venues didn't load, once, and loads them again on Try again", async () => {
    const { fixture, http, page } = await render();
    http
      .expectOne('/venues?dataCentre=Light')
      .flush(
        { errors: { body: ["The venues can't be reached right now. Try again in a few minutes."] } },
        { status: 502, statusText: 'Bad Gateway' },
      );
    // The data centres come on their own, so they're offered anyway.
    http.expectOne('/venues/regions').flush({ regions: list().regions });
    await fixture.whenStable();
    expect(page.querySelectorAll('cdt-venue-data-centres a')).toHaveLength(7);

    const failed = page.querySelector('.state') as HTMLElement;
    expect(failed.querySelector('h2')?.textContent?.trim()).toBe("The venues didn't load");
    expect(page.querySelectorAll('cdt-message')).toHaveLength(1);
    expect(page.querySelector('cdt-message')?.textContent).toContain("can't be reached right now");

    (failed.querySelector('button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(page.querySelector('[role=status]')?.textContent).toContain('Finding venues on Light');
    expect(page.querySelector('cdt-message')?.textContent?.trim()).toBe('');
    http.expectOne('/venues?dataCentre=Light').flush(list());
    await fixture.whenStable();

    expect(page.querySelector('.state')).toBeNull();
    expect(page.querySelectorAll('cdt-venue-card')).toHaveLength(3);
  });
});
