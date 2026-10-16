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

  it("lists the venue's events soonest first, each linking to its page, MATURE ones labelled", () => {
    const section = render([event(2, 30), event(1, -1), event(3, 5, { ageRating: 'MATURE' })]);

    expect(section.querySelector('h2')?.textContent).toBe('Upcoming events here');
    const items = [...section.querySelectorAll('li')];
    expect(items.map((li) => li.querySelector('a')?.textContent)).toEqual(['Event 1', 'Event 3', 'Event 2']);
    expect(items.map((li) => li.querySelector('a')?.getAttribute('href'))).toEqual([
      '/events/1',
      '/events/3',
      '/events/2',
    ]);
    expect(items[0].querySelector('.when')?.textContent).toContain('On now, until');
    expect(items[0].querySelector('.when')?.classList).toContain('live');
    expect(items[1].querySelector('.rating')?.textContent?.trim()).toBe('Rated Mature');
    expect(items[0].querySelector('.rating')).toBeNull();
  });

  it('shows nothing when no event is coming', () => {
    expect(render([]).querySelector('section')).toBeNull();
    TestBed.resetTestingModule();
    expect(render([event(4, -10)]).querySelector('section')).toBeNull();
  });
});
