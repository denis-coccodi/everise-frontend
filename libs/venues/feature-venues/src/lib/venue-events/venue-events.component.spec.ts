import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommunityEvent } from '@everise/core/api-types';
import { venueEvent as event } from '../venue-fixtures';
import { VenueEventsComponent } from './venue-events.component';

describe('VenueEventsComponent', () => {
  function render(events: CommunityEvent[]) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(VenueEventsComponent);
    fixture.componentRef.setInput('events', events);
    fixture.componentRef.setInput('now', Date.now());
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it("shows the venue's events as cards with their banners, soonest first, each linking to its page", () => {
    const section = render([
      event(2, 30, { banner: 'https://cdn.partake.gg/assets/2.webp' }),
      event(1, -1),
      event(3, 5, { ageRating: 'MATURE' }),
    ]);

    expect(section.querySelector('h2')?.textContent?.trim()).toBe('Upcoming events here');
    expect(section.querySelector('.hint')?.textContent).toContain('3 events this week, from Partake');
    const cards = [...section.querySelectorAll('cdt-event-card')];
    expect(cards.map((card) => card.querySelector('h3')?.textContent?.trim())).toEqual([
      'Event 1',
      'Event 3',
      'Event 2',
    ]);
    expect(cards.map((card) => card.querySelector('h3 a')?.getAttribute('href'))).toEqual([
      '/events/1',
      '/events/3',
      '/events/2',
    ]);
    expect(cards[2].querySelector('img.cover')?.getAttribute('src')).toBe('https://cdn.partake.gg/assets/2.webp');
    expect(cards[0].querySelector('.when')?.textContent).toContain('On now, until');
    expect(cards[1].querySelector('.rating')?.textContent?.trim()).toBe('Rated Mature');
    // Compact: where it is and who hosts it are the venue.
    expect(section.querySelector('cdt-event-card .where')).toBeNull();
  });

  it('says one event in words', () => {
    expect(render([event(1, 2)]).querySelector('.hint')?.textContent).toContain('One event this week');
  });

  it('shows nothing when no event is coming', () => {
    expect(render([]).querySelector('section')).toBeNull();
    TestBed.resetTestingModule();
    expect(render([event(4, -10)]).querySelector('section')).toBeNull();
  });
});
