import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { NewPasswordWithCode, PasswordResetRequest } from '@everise/core/api-types';
import { FormErrorsStore } from '@everise/core/forms';
import { Router } from '@angular/router';
import { exhaustMap, pipe, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import { resetEmailState } from './reset-email';
import type { PasswordResetState } from './password-reset.model';

// "Forgot password?": asking for a code by email, which goes on to the page
// for entering it, then setting a new password with it. Provided by those
// two pages; errors show in the page's <cdt-list-errors>.
export const PasswordResetStore = signalStore(
  withState<PasswordResetState>({ busy: false, done: false }),
  withMethods(
    (
      store,
      authService = inject(AuthService),
      authStore = inject(AuthStore),
      formErrorsStore = inject(FormErrorsStore),
      router = inject(Router),
    ) => {
      const failed = (response: HttpErrorResponse) => {
        patchState(store, { busy: false });
        formErrorsStore.setResponseErrors(response);
      };
      return {
        requestCode: rxMethod<PasswordResetRequest>(
          pipe(
            tap(() => patchState(store, { busy: true })),
            exhaustMap((request) =>
              authService.requestPasswordReset(request).pipe(
                tapResponse({
                  // Straight on to entering the code, saying where it went.
                  next: ({ passwordReset }) => {
                    patchState(store, { busy: false });
                    router.navigate(['/reset-password'], { state: resetEmailState(passwordReset.email) });
                  },
                  error: failed,
                }),
              ),
            ),
          ),
        ),
        reset: rxMethod<NewPasswordWithCode>(
          pipe(
            tap(() => patchState(store, { busy: true })),
            exhaustMap((request) =>
              authService.resetPassword(request).pipe(
                tapResponse({
                  next: () => {
                    patchState(store, { busy: false, done: true });
                    authStore.signedOut();
                  },
                  error: failed,
                }),
              ),
            ),
          ),
        ),
      };
    },
  ),
);
