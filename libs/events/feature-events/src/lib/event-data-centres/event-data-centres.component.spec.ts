import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '@everise/core/http-client';
import { EventsStore } from '@everise/events/data-access';
import { eventList } from '../event-fixtures';
import { EventDataCentresComponent } from './event-data-centres.component';

describe('EventDataCentresComponent', () => {
  it('links to every data centre, current, then to each with events this week', async () => {
    TestBed.configureTestingModule({
      providers: [
        EventsStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        provideRouter([]),
      ],
    });
    const fixture = TestBed.createComponent(EventDataCentresComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/events').flush(eventList());
    await fixture.whenStable();
    const nav = fixture.nativeElement as HTMLElement;

    const links = [...nav.querySelectorAll('a')];
    expect(links.map((a) => a.textContent?.trim())).toEqual(['All data centres', 'Chaos', 'Light']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/events', '/events?dc=chaos', '/events?dc=light']);
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(links[1].getAttribute('aria-current')).toBeNull();
    expect(nav.querySelector('nav')?.getAttribute('aria-labelledby')).toBe('event-data-centres');
  });
});
