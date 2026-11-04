import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '@everise/core/http-client';
import { initialUserValue } from './auth.model';
import { AuthStore } from './auth.store';
import { RECHECK_AFTER_MS, checkSessionOnReturn, sessionCheckInterceptor } from './session-check';

const signedIn = { ...initialUserValue, id: 'u1', username: 'Avar' };

describe('session check', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionCheckInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    const authStore = TestBed.inject(AuthStore);
    const http = TestBed.inject(HttpTestingController);
    authStore.confirmed(signedIn);
    return { authStore, http, client: TestBed.inject(HttpClient) };
  }

  function visibility(state: 'hidden' | 'visible') {
    const document = TestBed.inject(DOCUMENT);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  it('shows them signed out when a request is answered as a guest’s and the session has ended', () => {
    const { authStore, http, client } = setup();

    client.post('/api/planner/pulls', {}).subscribe({ error: () => undefined });
    http.expectOne('/api/planner/pulls').flush({}, { status: 429, statusText: 'Too Many Requests' });
    http.expectOne('/api/user').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authStore.loggedIn()).toBe(false);
    expect(authStore.user().id).toBe('');
  });

  it('keeps them signed in when the server still knows them', () => {
    const { authStore, http, client } = setup();

    client.get('/api/events/1').subscribe({ error: () => undefined });
    http.expectOne('/api/events/1').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/user').flush({ user: signedIn });

    expect(authStore.loggedIn()).toBe(true);
  });

  it('asks nothing for a guest, or for other errors', () => {
    const { authStore, http, client } = setup();

    client.get('/api/events').subscribe({ error: () => undefined });
    http.expectOne('/api/events').flush({}, { status: 500, statusText: 'Server Error' });
    authStore.signedOut();
    client.get('/api/events').subscribe({ error: () => undefined });
    http.expectOne('/api/events').flush({}, { status: 429, statusText: 'Too Many Requests' });

    http.verify();
  });

  it('asks again on coming back to the tab after a while, not after a moment', () => {
    const { authStore, http } = setup();
    let now = 0;
    const stop = TestBed.runInInjectionContext(() => checkSessionOnReturn(authStore, () => now));

    visibility('hidden');
    now = RECHECK_AFTER_MS - 1;
    visibility('visible');
    http.verify();

    visibility('hidden');
    now += RECHECK_AFTER_MS;
    visibility('visible');
    http.expectOne('/api/user').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(authStore.loggedIn()).toBe(false);
    stop();
  });

  it('changes nothing when the check itself fails to reach the server', () => {
    const { authStore, http } = setup();

    authStore.checkSession();
    http.expectOne('/api/user').error(new ProgressEvent('error'));

    expect(authStore.loggedIn()).toBe(true);
  });
});
