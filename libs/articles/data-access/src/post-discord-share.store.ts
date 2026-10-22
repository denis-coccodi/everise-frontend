import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { serverMessage } from '@everise/core/forms';
import { exhaustMap, pipe, tap } from 'rxjs';
import { ActionsService } from './actions.service';
import type { PostDiscordShareState } from './post-discord-share.model';

// One post's "Share to Discord" button: sends it to the Everise Discord and
// says how it went. Provided by the button, so each post has its own.
export const PostDiscordShareStore = signalStore(
  withState<PostDiscordShareState>({ status: 'idle', error: null }),
  withMethods((store, actionsService = inject(ActionsService)) => ({
    share: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { status: 'sending', error: null })),
        exhaustMap((articleId) =>
          actionsService.shareToDiscord(articleId).pipe(
            tapResponse({
              next: () => patchState(store, { status: 'shared' }),
              error: (error) => patchState(store, { status: 'error', error: serverMessage(error) }),
            }),
          ),
        ),
      ),
    ),
  })),
);
