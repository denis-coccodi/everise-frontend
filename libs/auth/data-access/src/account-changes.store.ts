import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { serverMessage } from '@everise/core/forms';
import { exhaustMap, pipe, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

// The account's email address or password, each changed in its own window
// in the settings. Both need the current password when the account has one
// (the backend checks it).
export type EmailChange = { email: string; currentPassword?: string };
export type PasswordChange = { password: string; currentPassword: string };

export type AccountChangesState = {
  // Which window is open.
  editing: 'email' | 'password' | null;
  saving: boolean;
  // Why the last try failed, shown in the window.
  error: string | null;
  // What the last change did, shown in the settings once the window closes.
  done: string | null;
};

// Provided by the settings' account section; its windows share it.
export const AccountChangesStore = signalStore(
  withState<AccountChangesState>({ editing: null, saving: false, error: null, done: null }),
  withMethods((store, authService = inject(AuthService), authStore = inject(AuthStore)) => {
    const saved = (done: string) => patchState(store, { saving: false, editing: null, done });
    const failed = (response: HttpErrorResponse) =>
      patchState(store, { saving: false, error: serverMessage(response) });
    return {
      open(editing: 'email' | 'password') {
        patchState(store, { editing, error: null, done: null });
      },
      close() {
        patchState(store, { editing: null, error: null });
      },
      // A new address waits for the link sent to it (pendingEmail).
      changeEmail: rxMethod<EmailChange>(
        pipe(
          tap(() => patchState(store, { saving: true, error: null })),
          exhaustMap((change) =>
            authService.update(change).pipe(
              tapResponse({
                next: ({ user }) => {
                  authStore.userChanged(user);
                  saved(
                    user.pendingEmail
                      ? `We sent a link to ${user.pendingEmail}. Your email changes once you open it. Nothing there? Look in your junk or spam folder.`
                      : 'Your email address is saved.',
                  );
                },
                error: failed,
              }),
            ),
          ),
        ),
      ),
      // Signs out every other device; this one gets a new session cookie.
      changePassword: rxMethod<PasswordChange>(
        pipe(
          tap(() => patchState(store, { saving: true, error: null })),
          exhaustMap((change) =>
            authService.update(change).pipe(
              tapResponse({
                next: ({ user }) => {
                  authStore.userChanged(user);
                  saved('Your password is changed. Every other device signed in to your account was signed out.');
                },
                error: failed,
              }),
            ),
          ),
        ),
      ),
    };
  }),
);
