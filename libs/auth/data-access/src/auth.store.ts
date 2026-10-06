import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { LoginUser, NewUser, User } from '@realworld/core/api-types';
import { setLoaded, setLoading, withCallState } from '@realworld/core/data-access';
import { FAILURE_MESSAGE, FormErrorsStore, UNREACHABLE_MESSAGE } from '@realworld/core/forms';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { AuthState, authInitialState, initialUserValue } from './auth.model';
import { AuthService } from './services/auth.service';

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>(authInitialState),
  withMethods(
    (store, formErrorsStore = inject(FormErrorsStore), authService = inject(AuthService), router = inject(Router)) => ({
      getUser: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loggedIn: false, ...setLoading('getUser') })),
          switchMap(() =>
            authService.user().pipe(
              tapResponse({
                next: ({ user }) =>
                  patchState(store, {
                    user,
                    loggedIn: true,
                    ...setLoaded('getUser'),
                  }),
                error: () => patchState(store, { loggedIn: false, ...setLoaded('getUser') }),
              }),
            ),
          ),
        ),
      ),
      login: rxMethod<LoginUser>(
        pipe(
          tap(() => patchState(store, { awaitingConfirmation: null })),
          exhaustMap((credentials) =>
            authService.login(credentials).pipe(
              tapResponse({
                next: ({ user }) => {
                  patchState(store, { user, loggedIn: true });
                  router.navigateByUrl('/');
                },
                error: (response: HttpErrorResponse) => {
                  formErrorsStore.setResponseErrors(response);
                  // The right password, but the email isn't confirmed yet.
                  const unconfirmed = response.error?.unconfirmedEmail;
                  if (response.status === 403 && typeof unconfirmed === 'string') {
                    patchState(store, { awaitingConfirmation: unconfirmed });
                  }
                },
              }),
            ),
          ),
        ),
      ),
      register: rxMethod<NewUser>(
        pipe(
          tap(() => patchState(store, { awaitingConfirmation: null })),
          exhaustMap((newUserData) =>
            authService.register(newUserData).pipe(
              tapResponse({
                next: (response) => {
                  if ('confirmation' in response) {
                    patchState(store, { awaitingConfirmation: response.confirmation.email });
                    return;
                  }
                  patchState(store, { user: response.user, loggedIn: true });
                  router.navigateByUrl('/');
                },
                error: (response: HttpErrorResponse) => formErrorsStore.setResponseErrors(response),
              }),
            ),
          ),
        ),
      ),
      updateUser: rxMethod<User>(
        pipe(
          exhaustMap((user) =>
            authService.update(user).pipe(
              tapResponse({
                next: ({ user }) => {
                  const newPending = !!user.pendingEmail && user.pendingEmail !== store.user().pendingEmail;
                  patchState(store, { user });
                  // A new email waits for its link: the settings say so.
                  if (!newPending) router.navigate(['profile', user.id]);
                },
                error: (response: HttpErrorResponse) => formErrorsStore.setResponseErrors(response),
              }),
            ),
          ),
        ),
      ),
      // Uploads a new profile picture. The page checks the limits first; the
      // server's message explains anything it still rejects.
      uploadImage: rxMethod<Blob>(
        pipe(
          tap(() => patchState(store, { imageBusy: true, imageError: null })),
          exhaustMap((file) =>
            authService.uploadImage(file).pipe(
              tapResponse({
                next: ({ user }) => patchState(store, { user, imageBusy: false }),
                error: (response: HttpErrorResponse) =>
                  patchState(store, { imageBusy: false, imageError: imageErrorMessage(response) }),
              }),
            ),
          ),
        ),
      ),
      removeImage: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { imageBusy: true, imageError: null })),
          exhaustMap(() =>
            authService.removeImage().pipe(
              tapResponse({
                next: ({ user }) => patchState(store, { user, imageBusy: false }),
                error: (response: HttpErrorResponse) =>
                  patchState(store, { imageBusy: false, imageError: imageErrorMessage(response) }),
              }),
            ),
          ),
        ),
      ),
      // Signed in from a confirmation link.
      confirmed(user: User) {
        patchState(store, { user, loggedIn: true, awaitingConfirmation: null });
      },
      // A problem the page found before uploading, or null to clear it.
      setImageError(message: string | null) {
        patchState(store, { imageError: message });
      },
      logout: rxMethod<void>(
        pipe(
          exhaustMap(() =>
            authService.logout().pipe(
              tapResponse({
                next: () => {
                  patchState(store, { user: initialUserValue, loggedIn: false });
                  router.navigateByUrl('login');
                },
                error: (response: HttpErrorResponse) => formErrorsStore.setResponseErrors(response),
              }),
            ),
          ),
        ),
      ),
    }),
  ),
  withCallState({ collection: 'getUser' }),
);

// The server's explanation of a failed picture upload, or a general one.
function imageErrorMessage(response: HttpErrorResponse): string {
  const message = response.error?.errors?.body?.[0];
  if (typeof message === 'string') return message;
  return response.status === 0 ? UNREACHABLE_MESSAGE : FAILURE_MESSAGE;
}
