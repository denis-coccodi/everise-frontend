import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { AuthStore } from '@realworld/auth/data-access';
import { SANDS_LIMITS, SandsCharacter, SandsEvent, SandsLine, SandsRoom } from '@realworld/core/api-types';
import { serverMessage } from '@realworld/core/forms';
import { LiveUpdates } from '@realworld/core/http-client';
import { Observable, exhaustMap, mergeMap, pipe, switchMap, tap } from 'rxjs';
import { WakingSandsService } from './waking-sands.service';

interface WakingSandsState {
  loadState: 'loading' | 'ready' | 'error';
  available: boolean;
  characters: SandsCharacter[];
  present: string[];
  lines: SandsLine[];
  // The character writing an answer right now, or null.
  writing: string | null;
  // What the member is typing, and while it's being sent.
  draft: string;
  sending: boolean;
  // The backend's words when something was refused (a limit, a full room).
  error: string;
}

const initialState: WakingSandsState = {
  loadState: 'loading',
  available: false,
  characters: [],
  present: [],
  lines: [],
  writing: null,
  draft: '',
  sending: false,
  error: '',
};

// The Waking Sands room, shared by everyone on the page: the characters,
// who's in, the day's lines and who's writing. It loads the room, then
// follows the live updates, and loads it again whenever the live connection
// (re)opens, for what it missed. Provided by the page.
export const WakingSandsStore = signalStore(
  withState<WakingSandsState>(initialState),
  withComputed((store, auth = inject(AuthStore)) => ({
    full: computed(() => store.present().length >= SANDS_LIMITS.maxPresent),
    canSend: computed(() => auth.loggedIn() && !store.sending() && !!store.draft().trim()),
    writingName: computed(() => {
      const id = store.writing();
      return id ? store.characters().find((c) => c.id === id)?.name ?? null : null;
    }),
  })),
  withMethods((store, service = inject(WakingSandsService), auth = inject(AuthStore)) => {
    // A line once, in the order it was said, whether it came live or loaded.
    const addLine = (line: SandsLine) =>
      patchState(store, ({ lines }) => ({
        lines: lines.some((l) => l.id === line.id) ? lines : [...lines, line].sort((a, b) => a.at.localeCompare(b.at)),
      }));
    const showRoom = (room: SandsRoom) => {
      patchState(store, {
        available: room.available,
        characters: room.characters,
        present: room.present,
        loadState: 'ready',
      });
      room.lines.forEach(addLine);
    };
    // Bringing a character in or sending one out, for everyone.
    const changePresence = (request: (id: string) => Observable<{ present: string[] }>) =>
      rxMethod<string>(
        pipe(
          tap(() => patchState(store, { error: '' })),
          mergeMap((id) =>
            request(id).pipe(
              tapResponse({
                next: ({ present }) => patchState(store, { present }),
                error: (error: unknown) => patchState(store, { error: serverMessage(error) }),
              }),
            ),
          ),
        ),
      );
    const load = rxMethod<void>(
      pipe(
        switchMap(() =>
          service.room().pipe(
            tapResponse({
              next: showRoom,
              // After a first load, a failed reload keeps what's shown.
              error: () => {
                if (store.loadState() === 'loading') patchState(store, { loadState: 'error' });
              },
            }),
          ),
        ),
      ),
    );
    return {
      load,
      character: (id: string) => store.characters().find((c) => c.id === id),
      isPresent: (id: string) => store.present().includes(id),
      // A member's line of the one signed in.
      isMine: (line: SandsLine) => line.from === 'member' && !!line.memberId && line.memberId === auth.user().id,
      setDraft: (draft: string) => patchState(store, { draft }),
      invite: changePresence((id) => service.invite(id)),
      dismiss: changePresence((id) => service.dismiss(id)),
      // Sends the draft. The characters' answers arrive live; once the
      // request ends, the room is loaded again for anything the live
      // updates missed (a dropped connection).
      send: rxMethod<void>(
        pipe(
          exhaustMap(() => {
            const text = store.draft().trim();
            patchState(store, { sending: true, error: '' });
            return service.say(text).pipe(
              tapResponse({
                next: ({ line }) => {
                  addLine(line);
                  patchState(store, { draft: '', sending: false });
                  load();
                },
                error: (error: unknown) => patchState(store, { sending: false, error: serverMessage(error) }),
              }),
            );
          }),
        ),
      ),
      // What the live updates say happened in the room.
      apply: (event: SandsEvent) => {
        switch (event.type) {
          case 'sands-line':
            addLine(event.line);
            break;
          case 'sands-presence':
            patchState(store, { present: event.present });
            break;
          case 'sands-writing':
            patchState(store, { writing: event.character });
            break;
        }
      },
    };
  }),
  withHooks((store, live = inject(LiveUpdates)) => ({
    onInit() {
      store.load();
      rxMethod<void>(tap(() => store.load()))(live.opened$);
      rxMethod<SandsEvent>(tap((event) => store.apply(event)))(live.sands$);
    },
  })),
);
