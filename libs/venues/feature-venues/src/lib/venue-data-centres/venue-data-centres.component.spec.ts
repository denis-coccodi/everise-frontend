import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '@everise/core/http-client';
import { VenuesStore } from '@everise/venues/data-access';
import { VenueDataCentresComponent } from './venue-data-centres.component';

describe('VenueDataCentresComponent', () => {
  it('links to the shown data centre before the others are known', () => {
    TestBed.configureTestingModule({
      providers: [
        VenuesStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        provideRouter([]),
      ],
    });
    const fixture = TestBed.createComponent(VenueDataCentresComponent);
    fixture.detectChanges();
    const nav = fixture.nativeElement as HTMLElement;

    const links = [...nav.querySelectorAll('a')];
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Light']);
    expect(links[0].getAttribute('href')).toBe('/venues?dc=light');
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(nav.querySelector('nav')?.getAttribute('aria-labelledby')).toBe('venue-data-centres');
  });
});
