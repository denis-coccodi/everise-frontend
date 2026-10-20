import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { NewPasswordWithCode, PasswordResetRequest } from '@everise/core/api-types';
import { FormErrorsStore } from '@everise/core/forms';
import { exhaustMap, pipe, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

export type PasswordResetState = {
  // Asking for a code, or setting the password, right now.
  busy: boolean;
  // Where a code may have gone (the answer is the same whether or not the
  // address has an account).
  sentTo: string | null;
  // The new password is set; every device was signed out.
  done: boolean;
};

// "Forgot password?": asking for a code by email, then setting a new
// password with it. Provided by those two pages; errors show in the page's
// <cdt-list-errors>.
export const PasswordResetStore = signalStore(
  withState<PasswordResetState>({ busy: false, sentTo: null, done: false }),
  withMethods(
    (
      store,
      authService = inject(AuthService),
      authStore = inject(AuthStore),
      formErrorsStore = inject(FormErrorsStore),
    ) => {
      const failed = (response: HttpErrorResponse) => {
        patchState(store, { busy: false });
        formErrorsStore.setResponseErrors(response);
      };
      return {
        requestCode: rxMethod<PasswordResetRequest>(
          pipe(
            tap(() => patchState(store, { busy: true, sentTo: null })),
            exhaustMap((request) =>
              authService.requestPasswordReset(request).pipe(
                tapResponse({
                  next: ({ passwordReset }) => patchState(store, { busy: false, sentTo: passwordReset.email }),
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
