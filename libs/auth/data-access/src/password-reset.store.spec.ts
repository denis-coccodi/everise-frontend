import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from '@everise/core/http-client';
import { FormErrorsStore } from '@everise/core/forms';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { AuthStore } from './auth.store';
import { PasswordResetStore } from './password-reset.store';

describe('PasswordResetStore', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [
        PasswordResetStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    return {
      store: TestBed.inject(PasswordResetStore),
      authStore: TestBed.inject(AuthStore),
      http: TestBed.inject(HttpTestingController),
    };
  }

  it('asks for a code, busy until the answer, then goes on to entering it, saying where it went', () => {
    const { store, http } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    store.requestCode({ user: { email: 'thancred@example.com' } });
    expect(store.busy()).toBe(true);
    http.expectOne('/api/users/password-reset').flush({ passwordReset: { email: 'thancred@example.com' } });

    expect(store.busy()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/reset-password'], {
      state: { resetEmail: 'thancred@example.com' },
    });
  });

  it('stays on the page when the server refuses', () => {
    const { store, http } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    store.requestCode({ user: { email: 'thancred@example.com' } });
    http
      .expectOne('/api/users/password-reset')
      .flush({ errors: { body: ['Too soon.'] } }, { status: 429, statusText: 'Too Many Requests' });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('sets the new password and signs this device out too', () => {
    const { store, authStore, http } = setup();
    patchState(unprotected(authStore), { loggedIn: true });

    store.reset({ code: 'ABCD-EFGH', password: 'new-crystal-1' });
    http.expectOne('/api/users/password-reset/confirm').flush(null, { status: 204, statusText: 'No Content' });

    expect(store.done()).toBe(true);
    expect(authStore.loggedIn()).toBe(false);
  });

  it("puts the server's message in the form's errors", () => {
    const { store, http } = setup();

    store.reset({ code: 'AAAA-AAAA', password: 'new-crystal-1' });
    http
      .expectOne('/api/users/password-reset/confirm')
      .flush({ errors: { body: ['That code is wrong.'] } }, { status: 422, statusText: 'Unprocessable Entity' });

    expect(store.busy()).toBe(false);
    expect(store.done()).toBe(false);
    expect(TestBed.inject(FormErrorsStore).errors()).toEqual(['That code is wrong.']);
  });
});
