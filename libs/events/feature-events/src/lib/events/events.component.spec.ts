import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL } from '@everise/core/http-client';
import { communityEvent, eventList as list } from '../event-fixtures';
import { EventsComponent } from './events.component';

describe('EventsComponent', () => {
  async function render(url = '/events') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        provideRouter([{ path: 'events', component: EventsComponent }]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    const fixture = harness.fixture;
    const http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const sections = () =>
      [...page.querySelectorAll('section')].map((section) => ({
        heading: section.querySelector('h2')?.textContent?.trim(),
        titles: [...section.querySelectorAll('h3')].map((h) => h.textContent?.trim()),
      }));
    return { harness, fixture, http, page, sections };
  }

  it("shows every data centre's events: those on now, then by the day they start", async () => {
    const { fixture, http, page, sections } = await render();

    expect(page.querySelector('.notice')?.textContent).toContain("Finding this week's events");
    http.expectOne('/events').flush(list());
    await fixture.whenStable();

    expect(page.querySelector('h1')?.textContent).toBe('Events');
    const shown = sections();
    expect(shown[0]).toEqual({ heading: 'On now', titles: ['Event 1'] });
    expect(shown.flatMap((section) => section.titles)).toEqual(['Event 1', 'Event 2', 'Event 3']);
    // A day heading over each day's events.
    expect(shown.length).toBeGreaterThanOrEqual(3);
    expect(page.querySelector('.source a')?.getAttribute('href')).toBe('https://www.partake.gg');
  });

  it("shows one data centre's events from its link, without asking again", async () => {
    const { harness, fixture, http, page, sections } = await render('/events?dc=chaos');
    http.expectOne('/events').flush(list());
    await fixture.whenStable();

    expect(sections().flatMap((section) => section.titles)).toEqual(['Event 2']);
    const current = page.querySelector('cdt-event-data-centres a[aria-current=page]');
    expect(current?.textContent?.trim()).toBe('Chaos');

    await harness.navigateByUrl('/events?dc=materia');
    await fixture.whenStable();
    http.expectNone('/events');
    const empty = page.querySelector('.state') as HTMLElement;
    expect(empty.querySelector('h2')?.textContent?.trim()).toBe('No events on Materia this week yet');
    expect(empty.querySelector('a')?.getAttribute('href')).toBe('https://www.partake.gg');
  });

  it('leaves out an event that ended since the list was read', async () => {
    const { fixture, http, sections } = await render();
    http.expectOne('/events').flush(list({ events: [communityEvent(4, -10), communityEvent(5, 3)] }));
    await fixture.whenStable();

    expect(sections().flatMap((section) => section.titles)).toEqual(['Event 5']);
  });

  it("says why the events didn't load, once, and loads them again on Try again", async () => {
    const { fixture, http, page } = await render();
    http
      .expectOne('/events')
      .flush(
        { errors: { body: ["The events can't be reached right now. Try again in a few minutes."] } },
        { status: 502, statusText: 'Bad Gateway' },
      );
    await fixture.whenStable();

    const failed = page.querySelector('.state') as HTMLElement;
    expect(failed.querySelector('h2')?.textContent?.trim()).toBe("The events didn't load");
    expect(page.querySelectorAll('cdt-message')).toHaveLength(1);
    expect(page.querySelector('cdt-message')?.textContent).toContain("can't be reached right now");

    (failed.querySelector('button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(page.querySelector('[role=status]')?.textContent).toContain("Finding this week's events");
    http.expectOne('/events').flush(list());
    await fixture.whenStable();

    expect(page.querySelector('.state')).toBeNull();
    expect(page.querySelectorAll('cdt-event-card')).toHaveLength(3);
  });
});
