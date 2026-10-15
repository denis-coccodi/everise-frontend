import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { VenueDetail } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { VenueShareStore } from '@everise/venues/data-access';
import { venue } from '../venue-fixtures';
import { VenueShareDialogComponent } from './venue-share-dialog.component';

describe('VenueShareDialogComponent', () => {
  async function render() {
    TestBed.configureTestingModule({
      providers: [VenueShareStore, provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '' }],
    });
    const store = TestBed.inject(VenueShareStore);
    store.open();
    const fixture = TestBed.createComponent(VenueShareDialogComponent);
    const { opensAt, closesAt, openNow, ...shown } = venue('abc', 2);
    const detail: VenueDetail = {
      ...shown,
      dataCentre: 'Light',
      nextOpening: { opensAt, closesAt, openNow },
      schedule: [],
    };
    fixture.componentRef.setInput('venue', detail);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return {
      fixture,
      store,
      dialog: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => document.body.replaceChildren());

  it('opens on the message, names the venue, and counts what is typed', async () => {
    const { fixture, dialog } = await render();

    const box = dialog.querySelector('#venue-share-message') as HTMLTextAreaElement;
    expect(document.activeElement).toBe(box);
    expect(dialog.querySelector('.what')?.textContent).toContain('Venue abc');
    box.value = 'Hi!';
    box.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(dialog.querySelector('#venue-share-count')?.textContent?.trim()).toBe('3 / 280');
  });

  it("keeps the window open with the backend's words when sharing fails, and Cancel closes it", async () => {
    const { fixture, store, dialog, http } = await render();

    (dialog.querySelector('button[type=submit]') as HTMLButtonElement).click();
    http
      .expectOne('/venues/discord')
      .flush(
        { errors: { body: ['You can share another venue in 42 seconds.'] } },
        { status: 429, statusText: 'Too Many Requests' },
      );
    await fixture.whenStable();

    expect(store.showing()).toBe(true);
    expect(dialog.querySelector('cdt-message')?.textContent).toContain('You can share another venue in 42 seconds.');

    [...dialog.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Cancel')?.click();
    expect(store.showing()).toBe(false);
  });
});
