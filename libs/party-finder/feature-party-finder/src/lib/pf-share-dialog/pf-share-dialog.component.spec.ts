import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DiscordSharingService } from '@everise/articles/data-access';
import { PartyFinderListing } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { PfShareStore, ShareWay } from '@everise/party-finder/data-access';
import { cardPicture } from './card-picture';
import { PfShareDialogComponent } from './pf-share-dialog.component';

// jsdom can't draw: the card's picture is a stand-in, and counted.
vi.mock('./card-picture', () => ({
  cardPicture: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
}));

const listing: PartyFinderListing = {
  id: '66-1',
  recruiter: 'Tataru Taru',
  description: 'Prog from P3',
  world: { id: 66, name: 'Odin' },
  homeWorld: { id: 67, name: 'Shiva' },
  category: 'HighEndDuty',
  duty: 'The Omega Protocol (Ultimate)',
  dutyIcon: null,
  level: 90,
  sortKey: 1004,
  highEnd: true,
  worldOnly: false,
  onePlayerPerJob: true,
  beginnersWelcome: false,
  minItemLevel: 0,
  objective: 'practice',
  dutyComplete: false,
  loot: 'normal',
  parties: 1,
  slots: [{ job: 'PLD', icon: 62119, roles: [], accepts: [] }],
  updatedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
};

@Component({
  imports: [PfShareDialogComponent],
  providers: [PfShareStore],
  template: `@if (store.sharing()) {
    <cdt-pf-share-dialog />
  }`,
})
class HostComponent {
  readonly store = inject(PfShareStore);
}

async function render(way: ShareWay) {
  vi.mocked(cardPicture).mockClear();
  TestBed.configureTestingModule({
    imports: [HostComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '' },
      { provide: DiscordSharingService, useValue: { available: signal(true) } },
    ],
  });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.store.open(listing, way, 'Light', { tank: 1, healer: 2, dps: 3, beginner: 4 });
  await fixture.whenStable();
  return { fixture, page: fixture.nativeElement as HTMLElement, http: TestBed.inject(HttpTestingController) };
}

describe('PfShareDialogComponent', () => {
  it("shows the card as it'll be shared, opens on a labelled message box, and offers Discord too for a post", async () => {
    const { page } = await render('post');

    expect(page.querySelector('[role=dialog] h2')?.textContent).toBe('Share as post');
    expect(page.querySelector('cdt-pf-listing h3')?.textContent?.trim()).toBe('The Omega Protocol (Ultimate)');
    const box = page.querySelector('textarea') as HTMLTextAreaElement;
    expect(page.querySelector(`label[for="${box.id}"]`)?.textContent?.trim()).toBe('Your message for the feed');
    expect(document.activeElement).toBe(box);
    expect(page.querySelector('cdt-checkbox')?.textContent?.trim()).toBe('Also share in the Everise Discord');
  });

  it('a post that stays on the site takes no picture', async () => {
    const { fixture, page, http } = await render('post');

    (page.querySelector('button[type=submit]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(cardPicture).not.toHaveBeenCalled();
    http.expectNone('/media');
    expect(JSON.parse(http.expectOne('/party-finder/posts').request.body)).toEqual({
      dataCentre: 'Light',
      listingId: '66-1',
    });
  });

  it('goes without the picture when the upload fails', async () => {
    const { fixture, page, http } = await render('discord');

    (page.querySelector('button[type=submit]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(cardPicture).toHaveBeenCalledOnce();
    http.expectOne('/media').flush({ errors: { body: ['Too large'] } }, { status: 413, statusText: 'Too Large' });

    expect(JSON.parse(http.expectOne('/party-finder/discord').request.body)).toEqual({
      dataCentre: 'Light',
      listingId: '66-1',
    });
  });

  it('Cancel closes it without sharing', async () => {
    const { fixture, page } = await render('discord');

    [...page.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Cancel')?.click();
    await fixture.whenStable();

    expect(page.querySelector('cdt-pf-share-dialog')).toBeNull();
    expect(fixture.componentInstance.store.shared()).toBeNull();
  });
});
