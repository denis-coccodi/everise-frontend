import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { serverMessage } from '@everise/core/forms';
import { exhaustMap, pipe, tap } from 'rxjs';
import { EventsService } from './events.service';

interface EventShareState {
  // The share window is open.
  showing: boolean;
  sending: boolean;
  // Why the last try failed, in the backend's words.
  error: string;
  // The last share went through, for the page's message.
  sent: boolean;
}

const initialState: EventShareState = { showing: false, sending: false, error: '', sent: false };

// Sharing an event in the Everise Discord, for signed-in members: the share
// window's state and the backend call. Provided by the event's page.
export const EventShareStore = signalStore(
  withState<EventShareState>(initialState),
  withMethods((store, service = inject(EventsService)) => ({
    open: () => patchState(store, { showing: true, error: '', sent: false }),
    close: () => patchState(store, { showing: false, error: '' }),
    send: rxMethod<{ eventId: number; comment: string }>(
      pipe(
        tap(() => patchState(store, { sending: true, error: '' })),
        exhaustMap(({ eventId, comment }) =>
          service.shareToDiscord({ eventId, ...(comment.trim() ? { comment: comment.trim() } : {}) }).pipe(
            tapResponse({
              next: () => patchState(store, { sending: false, showing: false, sent: true }),
              error: (error: unknown) => patchState(store, { sending: false, error: serverMessage(error) }),
            }),
          ),
        ),
      ),
    ),
  })),
);
