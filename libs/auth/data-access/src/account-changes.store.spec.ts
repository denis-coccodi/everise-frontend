import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '@everise/core/http-client';
import { AccountChangesStore } from './account-changes.store';
import { initialUserValue } from './auth.model';
import { AuthStore } from './auth.store';

describe('AccountChangesStore', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [
        AccountChangesStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    return {
      store: TestBed.inject(AccountChangesStore),
      authStore: TestBed.inject(AuthStore),
      http: TestBed.inject(HttpTestingController),
    };
  }

  it('opens a window with nothing left from before, and closes it', () => {
    const { store } = setup();

    store.open('password');
    expect(store.editing()).toBe('password');
    store.close();
    expect(store.editing()).toBeNull();
  });

  it('saves a new address, closes the window and updates the signed-in user', () => {
    const { store, authStore, http } = setup();
    store.open('email');

    store.changeEmail({ email: 'new@example.com', currentPassword: 'old-crystal' });
    expect(store.saving()).toBe(true);
    http.expectOne('/api/user').flush({ user: { ...initialUserValue, pendingEmail: 'new@example.com' } });

    expect(store.editing()).toBeNull();
    expect(store.done()).toContain('We sent a link to new@example.com.');
    expect(authStore.user().pendingEmail).toBe('new@example.com');
  });

  it("keeps the window open with the server's message", () => {
    const { store, http } = setup();
    store.open('password');

    store.changePassword({ password: 'new-crystal-1', currentPassword: 'not-it' });
    http
      .expectOne('/api/user')
      .flush(
        { errors: { body: ['Your current password is wrong.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

    expect(store.editing()).toBe('password');
    expect(store.saving()).toBe(false);
    expect(store.error()).toBe('Your current password is wrong.');
  });
});
