import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@everise/core/http-client';
import { EventShareStore } from '@everise/events/data-access';
import { eventDetail } from '../event-fixtures';
import { EventShareDialogComponent } from './event-share-dialog.component';

describe('EventShareDialogComponent', () => {
  async function render() {
    TestBed.configureTestingModule({
      providers: [EventShareStore, provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '' }],
    });
    const store = TestBed.inject(EventShareStore);
    store.open();
    const fixture = TestBed.createComponent(EventShareDialogComponent);
    fixture.componentRef.setInput('event', eventDetail());
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

  it('opens on the message, names the event, and counts what is typed', async () => {
    const { fixture, dialog } = await render();

    const box = dialog.querySelector('#event-share-message') as HTMLTextAreaElement;
    expect(document.activeElement).toBe(box);
    expect(dialog.querySelector('.what')?.textContent).toContain('Event 56133');
    box.value = 'Hi!';
    box.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(dialog.querySelector('#event-share-count')?.textContent?.trim()).toBe('3 / 280');
  });

  it("keeps the window open with the backend's words when sharing fails, and Cancel closes it", async () => {
    const { fixture, store, dialog, http } = await render();

    (dialog.querySelector('button[type=submit]') as HTMLButtonElement).click();
    const sent = http.expectOne('/events/discord');
    expect(JSON.parse(sent.request.body)).toEqual({ eventId: 56133 });
    sent.flush(
      { errors: { body: ['You can share another event in 42 seconds.'] } },
      { status: 429, statusText: 'Too Many Requests' },
    );
    await fixture.whenStable();

    expect(store.showing()).toBe(true);
    expect(dialog.querySelector('cdt-message')?.textContent).toContain('You can share another event in 42 seconds.');

    const cancel = [...dialog.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Cancel');
    cancel?.click();
    expect(store.showing()).toBe(false);
  });
});
