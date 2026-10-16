import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DiscordSharingService } from '@everise/articles/data-access';
import { AuthStore } from '@everise/auth/data-access';
import { User } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { eventDetail } from '../event-fixtures';
import { EventPageComponent } from './event-page.component';

const HOUR = 3_600_000;

describe('EventPageComponent', () => {
  async function render({ signedIn = false, discord = true } = {}) {
    TestBed.configureTestingModule({
      providers: [
        { provide: DiscordSharingService, useValue: { available: signal(discord) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        provideRouter([{ path: 'events/:id', component: EventPageComponent }]),
      ],
    });
    if (signedIn) TestBed.inject(AuthStore).confirmed({ id: 'u1', username: 'alisaie' } as User);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/events/56133');
    const http = TestBed.inject(HttpTestingController);
    const page = harness.fixture.nativeElement as HTMLElement;
    const settle = () => harness.fixture.whenStable();
    return { harness, http, page, settle };
  }

  it('shows the whole event to everyone, its time in theirs, and keeps it out of search engines', async () => {
    const { http, page, settle } = await render();
    expect(page.querySelector('[role=status]')?.textContent).toContain('Finding the event');

    http.expectOne('/events/56133').flush({ event: eventDetail({ ageRating: 'MATURE' }) });
    await settle();

    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Event 56133');
    expect(TestBed.inject(Title).getTitle()).toBe('Event 56133 · Events · Everise');
    expect(TestBed.inject(Meta).getTag("name='robots'")?.content).toBe('noindex');
    expect(page.querySelector('.back a')?.getAttribute('href')).toBe('/events?dc=light');
    expect(page.querySelector('.when')?.textContent).toContain('Starts');
    expect(page.querySelector('.hours')?.textContent).toMatch(/\d\d:\d\d – \d\d:\d\d/);
    expect(page.querySelector('.where')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Odin, Empyreum, Ward 30, Plot 52 (Light)',
    );
    expect(page.querySelector('.rating')?.textContent?.trim()).toBe('Rated Mature');
    // The organisers' Markdown, as the posts show theirs.
    const about = page.querySelector('.about cdt-rich-text') as HTMLElement;
    expect(about.querySelector('h2')?.textContent).toBe('Tonight');
    expect(about.querySelector('strong')?.textContent).toBe('date');
    expect(about.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
    expect(page.querySelector('.team')?.textContent?.trim()).toBe('Club Noir');
    expect([...page.querySelectorAll('.links a')].map((a) => a.getAttribute('href'))).toEqual([
      'https://discord.gg/example',
      'https://www.partake.gg/events/56133',
    ]);
    expect(page.querySelector('.side .hint')?.textContent).toContain('11 players are going, on Partake.');
    // Guests can't share.
    expect(page.querySelector('.share')).toBeNull();
  });

  it("says when the site doesn't list the event, and the robots tag goes with the page", async () => {
    const { harness, http, page, settle } = await render();

    http
      .expectOne('/events/56133')
      .flush({ errors: { body: ["That event isn't listed here."] } }, { status: 404, statusText: 'Not Found' });
    await settle();

    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Event not listed');
    expect(page.querySelector('cdt-message')?.textContent).toContain("That event isn't listed here.");

    harness.fixture.destroy();
    expect(TestBed.inject(Meta).getTag("name='robots'")).toBeNull();
  });

  it('lets members share it in the Discord with a message, and says when it went', async () => {
    const { http, page, settle } = await render({ signedIn: true });
    http.expectOne('/events/56133').flush({ event: eventDetail() });
    await settle();

    (page.querySelector('.share button') as HTMLButtonElement).click();
    await settle();
    const box = page.querySelector('#event-share-message') as HTMLTextAreaElement;
    box.value = '  Who is coming?  ';
    box.dispatchEvent(new Event('input'));
    (page.querySelector('cdt-event-share-dialog button[type=submit]') as HTMLButtonElement).click();
    await settle();

    const sent = http.expectOne('/events/discord');
    expect(JSON.parse(sent.request.body)).toEqual({ eventId: 56133, comment: 'Who is coming?' });
    sent.flush({ shared: true });
    await settle();

    expect(page.querySelector('cdt-event-share-dialog')).toBeNull();
    expect(page.querySelector('.share cdt-message')?.textContent?.trim()).toBe('Sent to the Everise Discord.');
  });

  it("says an event is over and doesn't offer sharing it, nor where the site can't share", async () => {
    const ended = new Date(Date.now() - HOUR).toISOString();
    const over = await render({ signedIn: true });
    over.http
      .expectOne('/events/56133')
      .flush({ event: eventDetail({ startsAt: new Date(Date.now() - 5 * HOUR).toISOString(), endsAt: ended }) });
    await over.settle();
    expect(over.page.querySelector('.when')?.textContent?.trim()).toBe('This event is over');
    expect(over.page.querySelector('.share')).toBeNull();
    TestBed.resetTestingModule();

    const noDiscord = await render({ signedIn: true, discord: false });
    noDiscord.http.expectOne('/events/56133').flush({ event: eventDetail() });
    await noDiscord.settle();
    expect(noDiscord.page.querySelector('.share')).toBeNull();
  });
});
