import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Venue } from '@everise/core/api-types';
import { venue } from '../venue-fixtures';
import { VenueCardComponent } from './venue-card.component';

describe('VenueCardComponent', () => {
  function render(shown: Venue) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(VenueCardComponent);
    fixture.componentRef.setInput('venue', shown);
    fixture.componentRef.setInput('now', Date.now());
    fixture.detectChanges();
    return { fixture, card: fixture.nativeElement as HTMLElement };
  }

  it('shows where and when, the first paragraph, the tags and the links', () => {
    const { card } = render(venue('abc', -1, { notices: ['Closed next week.'] }));

    expect(card.querySelector('h3')?.textContent?.trim()).toBe('Venue abc');
    // The name opens the venue's page here.
    expect(card.querySelector('h3 a')?.getAttribute('href')).toBe('/venues/abc');
    expect(card.querySelector('.opening')?.textContent).toContain('Open now, until');
    expect(card.querySelector('.opening')?.classList).toContain('open');
    expect(card.querySelector('.where')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Shiva, Goblet, Ward 25 (subdivision), Plot 48',
    );
    expect(card.querySelector('.notice')?.textContent).toBe('Notice from the owners: Closed next week.');
    expect(card.querySelector('.summary')?.textContent).toBe('A tavern in the desert.');
    expect([...card.querySelectorAll('.tags li')].map((li) => li.textContent?.trim())).toEqual(['Tavern', 'Drink']);
    expect(card.querySelector('.cover')?.getAttribute('alt')).toBe('');
    const links = [...card.querySelectorAll('.links a')] as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/venues/abc',
      'https://discord.gg/example',
      'https://example.com/',
    ]);
    // "More" repeats the name's link: out of the tab order and hidden from screen readers.
    expect(links[0].getAttribute('aria-hidden')).toBe('true');
    expect(links[0].getAttribute('tabindex')).toBe('-1');
    expect(links.slice(1).every((a) => a.target === '_blank' && a.rel === 'noopener noreferrer')).toBe(true);
  });

  it('leaves out what the venue has none of', () => {
    const { card } = render(
      venue('bare', 2, { banner: null, website: null, discord: null, tags: [], description: [] }),
    );

    expect(card.querySelector('img.cover')).toBeNull();
    expect(card.querySelector('.no-banner')?.getAttribute('aria-hidden')).toBe('true');
    expect(card.querySelector('.tags')).toBeNull();
    expect(card.querySelector('.summary')).toBeNull();
    expect(card.querySelector('.opening')?.classList).not.toContain('open');
    expect(card.querySelectorAll('.links a')).toHaveLength(1);
  });

  it("puts the site's own banner in place of one that doesn't load", () => {
    const { fixture, card } = render(venue('broken', 2));

    card.querySelector('img.cover')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(card.querySelector('img.cover')).toBeNull();
    expect(card.querySelector('.no-banner')).not.toBeNull();
  });
});
