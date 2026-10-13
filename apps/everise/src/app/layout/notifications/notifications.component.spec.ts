import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthStore } from '@everise/auth/data-access';
import { Notification, NotificationsResponse, User } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { NotificationsComponent } from './notifications.component';

@Component({ imports: [NotificationsComponent], template: '<cdt-notifications /><p id="outside">Elsewhere</p>' })
class PageComponent {}

const alisaie = { id: 'u-alisaie', username: 'Alisaie', image: '/alisaie.png' };
const alphinaud = { id: 'u-alphinaud', username: 'Alphinaud', image: '/alphinaud.png' };

function notification(changes: Partial<Notification>): Notification {
  return {
    id: 'favorite:post-1',
    type: 'favorite',
    at: new Date(Date.now() - 5.5 * 60000).toISOString(),
    seen: true,
    read: false,
    actors: [alisaie, alphinaud],
    actorCount: 2,
    article: { id: 'post-1', title: 'Coil tonight' },
    comment: null,
    ...changes,
  };
}

const answer = (notifications: Notification[], unseenCount = 0): NotificationsResponse => ({
  notifications,
  unseenCount,
});

describe('NotificationsComponent', () => {
  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        provideRouter([
          { path: '', component: PageComponent },
          { path: '**', component: PageComponent },
        ]),
      ],
    });
    TestBed.inject(AuthStore).confirmed({ id: 'me', username: 'me' } as User);
    const harness = await RouterTestingHarness.create('/');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/notifications/unseen').flush({ unseenCount: 2 });
    await harness.fixture.whenStable();
    const page = harness.fixture.nativeElement as HTMLElement;
    const bell = () => page.querySelector('button.bell') as HTMLButtonElement;
    const panel = () => page.querySelector('#notifications-panel') as HTMLElement;
    const stable = () => harness.fixture.whenStable();
    return { page, http, bell, panel, stable };
  }

  it('shows how many are new on the bell, in words for screen readers', async () => {
    const { bell, panel } = await render();

    expect(bell().querySelector('.count')?.textContent?.trim()).toBe('2');
    expect(bell().textContent?.replace(/\s+/g, ' ').trim()).toContain('Notifications, 2 new');
    expect(bell().getAttribute('aria-controls')).toBe('notifications-panel');
    expect(bell().getAttribute('aria-expanded')).toBe('false');
    expect(panel().hidden).toBe(true);
  });

  it('opens the list, seen at once; each line links who did it and the post', async () => {
    const { page, http, bell, panel, stable } = await render();

    bell().click();
    await stable();
    expect(bell().getAttribute('aria-expanded')).toBe('true');
    expect(panel().hidden).toBe(false);
    expect(panel().textContent).toContain('Checking…');
    http.expectOne('/notifications/seen').flush(
      answer([
        notification({}),
        notification({
          id: 'comment:post-1',
          type: 'comment',
          actors: [alphinaud],
          actorCount: 1,
          read: true,
          comment: { id: 'c1', excerpt: 'Count me in!' },
        }),
        notification({ id: 'follow:me:u-alisaie', type: 'follow', actors: [alisaie], actorCount: 1, article: null }),
      ]),
    );
    await stable();

    expect(bell().querySelector('.count')).toBeNull();
    const items = [...panel().querySelectorAll('li.item')];
    // The sentence as a screen reader reads it (spaces before a comma aside).
    const sentence = (item: Element) =>
      item.querySelector('.text')?.textContent?.replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
    expect(items.map(sentence)).toEqual([
      'Alisaie and Alphinaud liked your post Coil tonight, unread',
      'Alphinaud commented on your post Coil tonight',
      'Alisaie started following you, unread',
    ]);
    const links = [...items[0].querySelectorAll('.text a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/profile/u-alisaie', '/profile/u-alphinaud', '/article/post-1']);
    expect(items[1].querySelector('.excerpt')?.textContent).toBe('“Count me in!”');
    expect(items[0].querySelector('.age')?.textContent?.trim()).toBe('5 min');
    expect(items.map((item) => item.classList.contains('unread'))).toEqual([true, false, true]);
    expect(page.querySelector('.panel-head button')?.textContent?.trim()).toBe('Mark all as read');
  });

  it('following a link opens it: read, and the panel closes', async () => {
    const { http, bell, panel, stable } = await render();
    bell().click();
    await stable();
    http.expectOne('/notifications/seen').flush(answer([notification({})]));
    await stable();

    (panel().querySelector('a.what') as HTMLAnchorElement).click();
    await stable();

    expect(TestBed.inject(Router).url).toBe('/article/post-1');
    http.expectOne('/notifications/favorite%3Apost-1/read').flush(answer([notification({ read: true })]));
    await stable();
    expect(panel().hidden).toBe(true);
  });

  it('marks all read, and closes on Escape (back to the bell) or a click outside', async () => {
    const { page, http, bell, panel, stable } = await render();
    bell().click();
    await stable();
    http.expectOne('/notifications/seen').flush(answer([notification({})]));
    await stable();

    (page.querySelector('.panel-head button') as HTMLButtonElement).click();
    http.expectOne('/notifications/read').flush(answer([notification({ read: true })]));
    await stable();
    expect(panel().querySelector('li.unread')).toBeNull();
    expect(page.querySelector('.panel-head button')).toBeNull();

    panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await stable();
    expect(panel().hidden).toBe(true);
    expect(document.activeElement).toBe(bell());

    bell().click();
    await stable();
    http.expectOne('/notifications/seen').flush(answer([notification({ read: true })]));
    (page.querySelector('#outside') as HTMLElement).click();
    await stable();
    expect(panel().hidden).toBe(true);
  });

  it('says so when there are none yet', async () => {
    const { http, bell, panel, stable } = await render();
    bell().click();
    await stable();
    http.expectOne('/notifications/seen').flush(answer([]));
    await stable();

    expect(panel().textContent).toContain('Nothing yet.');
  });
});
