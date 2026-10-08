import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { DataCentre, PartyFinderListing } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { exhaustMap, pipe, tap } from 'rxjs';
import { PartyFinderService } from './party-finder.service';

// How a member shares a listing: as a post in the feeds, or in the Everise
// Discord only.
export type ShareWay = 'post' | 'discord';

// What the member wrote, and (for a post) whether it goes to Discord too.
export interface ShareChoice {
  comment: string;
  shareToDiscord: boolean;
}

interface PfShareState {
  // The listing in the share window, the way it's shared and its data
  // centre; null while the window is closed.
  sharing: { listing: PartyFinderListing; way: ShareWay; dataCentre: DataCentre } | null;
  sending: boolean;
  // Why the last try failed, in the backend's words.
  error: string;
  // What the last share did, for the page's message: the post made, or
  // the Discord message sent.
  shared: { way: 'post'; articleId: string } | { way: 'discord' } | null;
}

const initialState: PfShareState = { sharing: null, sending: false, error: '', shared: null };

// Sharing a Party Finder listing, for signed-in members: the share window's
// state, and the backend calls. Provided by the Party Finder page.
export const PfShareStore = signalStore(
  withState<PfShareState>(initialState),
  withMethods((store, service = inject(PartyFinderService)) => ({
    open(listing: PartyFinderListing, way: ShareWay, dataCentre: DataCentre) {
      patchState(store, { sharing: { listing, way, dataCentre }, sending: false, error: '', shared: null });
    },
    close() {
      patchState(store, { sharing: null, sending: false, error: '' });
    },
    send: rxMethod<ShareChoice>(
      pipe(
        tap(() => patchState(store, { sending: true, error: '' })),
        exhaustMap(({ comment, shareToDiscord }) => {
          const sharing = store.sharing();
          if (!sharing) return [];
          const share = {
            dataCentre: sharing.dataCentre,
            listingId: sharing.listing.id,
            ...(comment.trim() ? { comment: comment.trim() } : {}),
          };
          const done = (shared: PfShareState['shared']) => patchState(store, { sharing: null, sending: false, shared });
          const failed = (error: unknown) => patchState(store, { sending: false, error: serverMessage(error) });
          return sharing.way === 'post'
            ? service.sharePost({ ...share, ...(shareToDiscord ? { shareToDiscord: true } : {}) }).pipe(
                tapResponse({
                  next: ({ article }) => done({ way: 'post', articleId: article.id }),
                  error: failed,
                }),
              )
            : service.shareToDiscord(share).pipe(tapResponse({ next: () => done({ way: 'discord' }), error: failed }));
        }),
      ),
    ),
  })),
);
