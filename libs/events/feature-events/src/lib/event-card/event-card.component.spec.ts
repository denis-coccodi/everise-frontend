import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommunityEvent } from '@everise/core/api-types';
import { communityEvent } from '../event-fixtures';
import { EventCardComponent } from './event-card.component';

describe('EventCardComponent', () => {
  function render(shown: CommunityEvent) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(EventCardComponent);
    fixture.componentRef.setInput('event', shown);
    fixture.componentRef.setInput('now', Date.now());
    fixture.detectChanges();
    return { fixture, card: fixture.nativeElement as HTMLElement };
  }

  it('shows when and where, who hosts it, the summary, the tags and the links', () => {
    const { card } = render(communityEvent(7, -1));

    expect(card.querySelector('h3')?.textContent?.trim()).toBe('Event 7');
    // The title opens the event's page here.
    expect(card.querySelector('h3 a')?.getAttribute('href')).toBe('/events/7');
    expect(card.querySelector('.when')?.textContent).toContain('On now, until');
    expect(card.querySelector('.when')?.classList).toContain('live');
    expect(card.querySelector('.where')?.textContent?.trim()).toBe('Odin, Empyreum, Ward 30, Plot 52 (Light)');
    expect(card.querySelector('.team')?.textContent?.trim()).toBe('Hosted by Club Noir');
    expect(card.querySelector('.summary')?.textContent).toBe('Bring a date and dance the night away.');
    expect([...card.querySelectorAll('.tags li')].map((li) => li.textContent?.trim())).toEqual([
      'Bars & Lounges',
      'Live DJs',
    ]);
    expect(card.querySelector('.cover')?.getAttribute('alt')).toBe('');
    // Only MATURE events are labelled.
    expect(card.querySelector('.rating')).toBeNull();
    const links = [...card.querySelectorAll('.links a')] as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/events/7',
      'https://discord.gg/example',
      'https://www.partake.gg/events/7',
    ]);
    // "More" repeats the title's link: out of the tab order and hidden from screen readers.
    expect(links[0].getAttribute('aria-hidden')).toBe('true');
    expect(links[0].getAttribute('tabindex')).toBe('-1');
    expect(links.slice(1).every((a) => a.target === '_blank' && a.rel === 'noopener noreferrer')).toBe(true);
  });

  it('labels a MATURE event in words, not only colour', () => {
    const { card } = render(communityEvent(8, 2, { ageRating: 'MATURE' }));

    expect(card.querySelector('.rating')?.textContent?.trim()).toBe('Rated Mature');
    expect(card.querySelector('.when')?.textContent).toContain('Starts');
    expect(card.querySelector('.when')?.classList).not.toContain('live');
  });

  it('leaves out what the event has none of', () => {
    const { card } = render(
      communityEvent(9, 2, { banner: null, team: null, tags: [], summary: '', location: null, world: null }),
    );

    expect(card.querySelector('img.cover')).toBeNull();
    expect(card.querySelector('.no-banner')?.getAttribute('aria-hidden')).toBe('true');
    expect(card.querySelector('.where')?.textContent?.trim()).toBe('Light');
    expect(card.querySelector('.team')).toBeNull();
    expect(card.querySelector('.tags')).toBeNull();
    expect(card.querySelector('.summary')).toBeNull();
    expect(card.querySelectorAll('.links a')).toHaveLength(2);
  });

  it("puts the site's own banner in place of one that doesn't load", () => {
    const { fixture, card } = render(communityEvent(10, 2));

    card.querySelector('img.cover')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(card.querySelector('img.cover')).toBeNull();
    expect(card.querySelector('.no-banner')).not.toBeNull();
  });
});
