import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { DataCentre, PartyFinderBoard, PartyFinderListing } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { MediaService } from '@everise/media/data-access';
import { catchError, exhaustMap, map, of, pipe, switchMap, tap } from 'rxjs';
import { PartyFinderService } from './party-finder.service';
import { PartyFinderStore } from './party-finder.store';

// How a member shares a listing: as a post in the feeds, or in the Everise
// Discord only.
export type ShareWay = 'post' | 'discord';

// What the member wrote, whether a post goes to Discord too, and the
// picture of the listing's card for Discord, when the browser made one.
export interface ShareChoice {
  comment: string;
  shareToDiscord: boolean;
  picture?: Blob;
}

interface PfShareState {
  // The listing in the share window, the way it's shared, its data centre
  // and the icons to draw it; null while the window is closed.
  sharing: {
    listing: PartyFinderListing;
    way: ShareWay;
    dataCentre: DataCentre;
    icons: PartyFinderBoard['icons'];
  } | null;
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
  withMethods(
    (
      store,
      service = inject(PartyFinderService),
      media = inject(MediaService),
      board = inject(PartyFinderStore, { optional: true }),
    ) => {
      // The picture, uploaded first; the share goes without it if that fails.
      const upload = (picture: Blob | undefined) =>
        picture
          ? media.upload(picture).pipe(
              map(({ id }) => id),
              catchError(() => of(undefined)),
            )
          : of(undefined);
      const done = (shared: PfShareState['shared']) => patchState(store, { sharing: null, sending: false, shared });
      const failed = (error: unknown) => {
        patchState(store, { sending: false, error: serverMessage(error) });
        // Gone from the board while the member wrote: show what's up now.
        if (error instanceof HttpErrorResponse && error.status === 404) board?.load();
      };
      return {
        open(listing: PartyFinderListing, way: ShareWay, dataCentre: DataCentre, icons: PartyFinderBoard['icons']) {
          patchState(store, { sharing: { listing, way, dataCentre, icons }, sending: false, error: '', shared: null });
        },
        close() {
          patchState(store, { sharing: null, sending: false, error: '' });
        },
        send: rxMethod<ShareChoice>(
          pipe(
            tap(() => patchState(store, { sending: true, error: '' })),
            exhaustMap(({ comment, shareToDiscord, picture }) => {
              const sharing = store.sharing();
              if (!sharing) return [];
              return upload(picture).pipe(
                switchMap((pictureId) => {
                  const share = {
                    dataCentre: sharing.dataCentre,
                    listingId: sharing.listing.id,
                    ...(comment.trim() ? { comment: comment.trim() } : {}),
                    ...(pictureId ? { pictureId } : {}),
                  };
                  return sharing.way === 'post'
                    ? service.sharePost({ ...share, ...(shareToDiscord ? { shareToDiscord: true } : {}) }).pipe(
                        tapResponse({
                          next: ({ article }) => done({ way: 'post', articleId: article.id }),
                          error: failed,
                        }),
                      )
                    : service
                        .shareToDiscord(share)
                        .pipe(tapResponse({ next: () => done({ way: 'discord' }), error: failed }));
                }),
              );
            }),
          ),
        ),
      };
    },
  ),
);
