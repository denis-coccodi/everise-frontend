import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { NotificationsResponse, User } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { NOTIFICATIONS_POLL_MS, NotificationsStore } from './notifications.store';

const list = (read: boolean): NotificationsResponse => ({
  unseenCount: 0,
  notifications: [
    {
      id: 'follow:me:alisaie',
      type: 'follow',
      at: new Date().toISOString(),
      seen: true,
      read,
      actors: [{ id: 'alisaie', username: 'Alisaie', image: '/a.png' }],
      actorCount: 1,
      article: null,
      comment: null,
      partyFinder: null,
      role: null,
    },
  ],
});

describe('NotificationsStore', () => {
  function setUp() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', children: [] }]),
        { provide: API_URL, useValue: '' },
      ],
    });
    const auth = TestBed.inject(AuthStore);
    const store = TestBed.inject(NotificationsStore);
    const http = TestBed.inject(HttpTestingController);
    const settle = () => TestBed.inject(ApplicationRef).whenStable();
    return { auth, store, http, settle };
  }

  it('asks how many are new once signed in, then every minute, and forgets them on signing out', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const { auth, store, http, settle } = setUp();
      await settle();
      http.expectNone('/notifications/unseen');

      auth.confirmed({ id: 'me', username: 'me' } as User);
      await settle();
      http.expectOne('/notifications/unseen').flush({ unseenCount: 3 });
      expect(store.unseenCount()).toBe(3);

      vi.advanceTimersByTime(NOTIFICATIONS_POLL_MS);
      http.expectOne('/notifications/unseen').flush({ unseenCount: 4 });
      expect(store.unseenCount()).toBe(4);

      // A failed check keeps the badge.
      vi.advanceTimersByTime(NOTIFICATIONS_POLL_MS);
      http.expectOne('/notifications/unseen').flush(null, { status: 502, statusText: 'Bad Gateway' });
      expect(store.unseenCount()).toBe(4);

      auth.logout();
      await settle();
      http.match(() => true).forEach((request) => request.flush({}));
      await settle();
      expect(store.unseenCount()).toBe(0);
      expect(store.notifications()).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opening the list reads it and makes them seen; opening one marks it read at once', async () => {
    const { store, http } = setUp();

    store.open();
    expect(store.loadState()).toBe('loading');
    const seen = http.expectOne('/notifications/seen');
    expect(seen.request.method).toBe('POST');
    seen.flush(list(false));
    expect(store.loadState()).toBe('ready');
    expect(store.notifications()[0].read).toBe(false);

    store.markRead('follow:me:alisaie');
    expect(store.notifications()[0].read).toBe(true);
    http.expectOne('/notifications/follow%3Ame%3Aalisaie/read').flush(list(true));

    store.markAllRead();
    http.expectOne('/notifications/read').flush(list(true));
    expect(store.notifications()[0].read).toBe(true);
  });

  it('keeps the list when an action fails, and says why', async () => {
    const { store, http } = setUp();
    store.open();
    http.expectOne('/notifications/seen').flush(list(false));

    store.markAllRead();
    http
      .expectOne('/notifications/read')
      .flush({ errors: { body: ['Try again in a minute.'] } }, { status: 502, statusText: 'Bad Gateway' });

    expect(store.loadState()).toBe('ready');
    expect(store.notifications()).toHaveLength(1);
    expect(store.error()).toBe('Try again in a minute.');
  });
});
