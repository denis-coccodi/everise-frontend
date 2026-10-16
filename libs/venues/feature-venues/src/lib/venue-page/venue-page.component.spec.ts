import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DiscordSharingService } from '@everise/articles/data-access';
import { AuthStore } from '@everise/auth/data-access';
import { User, VenueDetail } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { venue, venueEvent } from '../venue-fixtures';
import { VenuePageComponent } from './venue-page.component';

const HOUR = 3_600_000;

function detail(changes: Partial<VenueDetail> = {}): VenueDetail {
  const { opensAt, closesAt, openNow, ...shown } = venue('abc', 2);
  return {
    ...shown,
    description: ['Welcome to Decibel!', 'Discord Link : https://discord.gg/gPp6SVss87'],
    dataCentre: 'Light',
    nextOpening: { opensAt, closesAt, openNow },
    schedule: [
      { opensAt, closesAt, repeat: { every: 'weeks', weeks: 1 } },
      {
        opensAt: new Date(Date.parse(opensAt) + 14 * 24 * HOUR).toISOString(),
        closesAt: new Date(Date.parse(closesAt) + 14 * 24 * HOUR).toISOString(),
        repeat: { every: 'month', week: -1 },
      },
    ],
    ...changes,
  };
}

describe('VenuePageComponent', () => {
  async function render({ signedIn = false, discord = true } = {}) {
    TestBed.configureTestingModule({
      providers: [
        { provide: DiscordSharingService, useValue: { available: signal(discord) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        provideRouter([{ path: 'venues/:id', component: VenuePageComponent }]),
      ],
    });
    if (signedIn) TestBed.inject(AuthStore).confirmed({ id: 'u1', username: 'alisaie' } as User);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/venues/abc');
    const http = TestBed.inject(HttpTestingController);
    const page = harness.fixture.nativeElement as HTMLElement;
    const settle = () => harness.fixture.whenStable();
    return { harness, http, page, settle };
  }

  it('shows the whole venue to everyone, its openings in their time, and keeps it out of search engines', async () => {
    const { http, page, settle } = await render();
    expect(page.querySelector('[role=status]')?.textContent).toContain('Finding the venue');

    http.expectOne('/venues/abc').flush({ venue: detail(), events: [venueEvent(56133, 3)] });
    await settle();

    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Venue abc');
    expect(TestBed.inject(Title).getTitle()).toBe('Venue abc · Venues · Everise');
    expect(TestBed.inject(Meta).getTag("name='robots'")?.content).toBe('noindex');
    expect(page.querySelector('.back a')?.getAttribute('href')).toBe('/venues?dc=light');
    expect(page.querySelector('.where')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Shiva, Goblet, Ward 25 (subdivision), Plot 48 (Light)',
    );
    // The owners' web addresses are links, the rest text.
    const about = [...page.querySelectorAll('.about p')];
    expect(about.map((p) => p.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Welcome to Decibel!',
      'Discord Link : https://discord.gg/gPp6SVss87 (opens in a new tab)',
    ]);
    expect(about[1].querySelector('a')?.getAttribute('href')).toBe('https://discord.gg/gPp6SVss87');
    const repeats = [...page.querySelectorAll('.schedule .repeat')].map((r) => r.textContent?.trim());
    expect(repeats[0]).toMatch(/^Every \w+day$/);
    expect(repeats[1]).toMatch(/^Last \w+day of the month$/);
    expect([...page.querySelectorAll('.links a')].map((a) => a.getAttribute('href'))).toEqual([
      'https://discord.gg/example',
      'https://example.com/',
      'https://ffxivvenues.com/venue/abc',
    ]);
    // The week's events held there, linking to their pages.
    expect(page.querySelector('cdt-venue-events h2')?.textContent).toBe('Upcoming events here');
    expect(page.querySelector('cdt-venue-events a')?.getAttribute('href')).toBe('/events/56133');
    // Guests can't share.
    expect(page.querySelector('.share')).toBeNull();
  });

  it("says when the site doesn't list the venue, and the robots tag goes with the page", async () => {
    const { harness, http, page, settle } = await render();

    http
      .expectOne('/venues/abc')
      .flush({ errors: { body: ["That venue isn't listed here."] } }, { status: 404, statusText: 'Not Found' });
    await settle();

    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Venue not listed');
    expect(page.querySelector('cdt-message')?.textContent).toContain("That venue isn't listed here.");

    harness.fixture.destroy();
    expect(TestBed.inject(Meta).getTag("name='robots'")).toBeNull();
  });

  it('lets members share it in the Discord with a message, and says when it went', async () => {
    const { http, page, settle } = await render({ signedIn: true });
    http.expectOne('/venues/abc').flush({ venue: detail({ nextOpening: null }), events: [] });
    await settle();
    expect(page.querySelector('.opening')?.textContent).toBe('No opening set right now');

    (page.querySelector('.share button') as HTMLButtonElement).click();
    await settle();
    const box = page.querySelector('#venue-share-message') as HTMLTextAreaElement;
    box.value = '  Drinks tonight?  ';
    box.dispatchEvent(new Event('input'));
    (page.querySelector('cdt-venue-share-dialog button[type=submit]') as HTMLButtonElement).click();
    await settle();

    const sent = http.expectOne('/venues/discord');
    expect(JSON.parse(sent.request.body)).toEqual({ venueId: 'abc', comment: 'Drinks tonight?' });
    sent.flush({ shared: true });
    await settle();

    expect(page.querySelector('cdt-venue-share-dialog')).toBeNull();
    expect(page.querySelector('.share cdt-message')?.textContent?.trim()).toBe('Sent to the Everise Discord.');
  });

  it("doesn't offer sharing where the site can't share in Discord", async () => {
    const { http, page, settle } = await render({ signedIn: true, discord: false });
    http.expectOne('/venues/abc').flush({ venue: detail(), events: [] });
    await settle();

    expect(page.querySelector('.share')).toBeNull();
  });
});
