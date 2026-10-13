import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { AuthStore } from '@everise/auth/data-access';
import { Notification, NotificationsResponse } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { exhaustMap, fromEvent, interval, merge, mergeMap, pipe, switchMap, tap } from 'rxjs';
import { NotificationsService } from './notifications.service';

// How often the header asks how many are new (and when the tab is shown
// again).
export const NOTIFICATIONS_POLL_MS = 60 * 1000;

interface NotificationsState {
  notifications: Notification[];
  // The badge: notifications the member hasn't seen in the list yet.
  unseenCount: number;
  // The list: 'idle' until first opened.
  loadState: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
}

const initialState: NotificationsState = { notifications: [], unseenCount: 0, loadState: 'idle', error: '' };

// The signed-in member's notifications, for the header's bell: how many are
// new (asked every minute while the tab is shown, and when it's shown
// again), and the list, read when the member opens it, which also makes
// them all seen. Opening one, or "Mark all as read", marks them read.
// Signing out forgets them. App-wide: the header is on every page.
export const NotificationsStore = signalStore(
  { providedIn: 'root' },
  withState<NotificationsState>(initialState),
  withMethods((store, service = inject(NotificationsService)) => {
    const answered = ({ notifications, unseenCount }: NotificationsResponse) =>
      patchState(store, { notifications, unseenCount, loadState: 'ready', error: '' });
    // A failure keeps the list shown, and says why.
    const failed = (error: unknown) =>
      patchState(store, {
        loadState: store.loadState() === 'ready' ? 'ready' : 'error',
        error: serverMessage(error),
      });
    return {
      refreshCount: rxMethod<void>(
        pipe(
          switchMap(() =>
            service.unseen().pipe(
              tapResponse({
                next: ({ unseenCount }) => patchState(store, { unseenCount }),
                // The badge stays as it was; the next check tries again.
                error: () => undefined,
              }),
            ),
          ),
        ),
      ),
      // The member opened the list: the newest, and none new any more.
      open: rxMethod<void>(
        pipe(
          tap(() => {
            if (store.loadState() !== 'ready') patchState(store, { loadState: 'loading' });
          }),
          switchMap(() => service.markSeen().pipe(tapResponse({ next: answered, error: failed }))),
        ),
      ),
      // One opened: read at once, and on the backend.
      markRead: rxMethod<string>(
        pipe(
          tap((id) =>
            patchState(store, ({ notifications }) => ({
              notifications: notifications.map((n) => (n.id === id ? { ...n, read: true, seen: true } : n)),
            })),
          ),
          mergeMap((id) => service.markRead(id).pipe(tapResponse({ next: answered, error: failed }))),
        ),
      ),
      markAllRead: rxMethod<void>(
        pipe(exhaustMap(() => service.markAllRead().pipe(tapResponse({ next: answered, error: failed })))),
      ),
      clear: () => patchState(store, initialState),
    };
  }),
  withHooks((store, auth = inject(AuthStore)) => ({
    onInit() {
      // Signing in asks at once; signing out forgets.
      rxMethod<boolean>(tap((loggedIn) => (loggedIn ? store.refreshCount() : store.clear())))(auth.loggedIn);
      rxMethod<unknown>(
        tap(() => {
          if (auth.loggedIn() && document.visibilityState === 'visible') store.refreshCount();
        }),
      )(merge(interval(NOTIFICATIONS_POLL_MS), fromEvent(document, 'visibilitychange')));
    },
  })),
);
