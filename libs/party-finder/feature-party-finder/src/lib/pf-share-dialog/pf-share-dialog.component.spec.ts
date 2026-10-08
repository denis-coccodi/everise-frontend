import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DiscordSharingService } from '@everise/articles/data-access';
import { PartyFinderListing } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { PfShareStore, ShareWay } from '@everise/party-finder/data-access';
import { PfShareDialogComponent } from './pf-share-dialog.component';

const listing = {
  id: '66-1',
  recruiter: 'Tataru Taru',
  world: { id: 66, name: 'Odin' },
  category: 'HighEndDuty',
  duty: 'The Omega Protocol (Ultimate)',
} as PartyFinderListing;

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
  fixture.componentInstance.store.open(listing, way, 'Light');
  await fixture.whenStable();
  return { fixture, page: fixture.nativeElement as HTMLElement };
}

describe('PfShareDialogComponent', () => {
  it('says what is shared, opens on a labelled message box, and offers Discord too for a post', async () => {
    const { page } = await render('post');

    expect(page.querySelector('[role=dialog] h2')?.textContent).toBe('Share as post');
    expect(page.querySelector('.what')?.textContent?.trim()).toBe('The Omega Protocol (Ultimate)');
    expect(page.querySelector('.where')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Tataru Taru · Odin (Light)');
    const box = page.querySelector('textarea') as HTMLTextAreaElement;
    expect(page.querySelector(`label[for="${box.id}"]`)?.textContent?.trim()).toBe('Your message for the feed');
    expect(document.activeElement).toBe(box);
    expect(page.querySelector('cdt-checkbox')?.textContent?.trim()).toBe('Also share in the Everise Discord');
  });

  it('Cancel closes it without sharing', async () => {
    const { fixture, page } = await render('discord');

    [...page.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Cancel')?.click();
    await fixture.whenStable();

    expect(page.querySelector('cdt-pf-share-dialog')).toBeNull();
    expect(fixture.componentInstance.store.shared()).toBeNull();
  });
});
