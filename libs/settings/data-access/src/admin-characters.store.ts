import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { CharacterChanges, CharacterResponse, CharacterSettings, CharactersResponse } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { Observable, exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { AdminService } from './admin.service';

interface AdminCharactersState {
  // Null until they arrive.
  characters: CharacterSettings[] | null;
  // The longest title and personality the backend takes; null until loaded.
  limits: CharactersResponse['limits'] | null;
  selectedId: string | null;
  busy: boolean;
  status: string;
  error: string | null;
}

// For admins: the Waking Sands characters, one open at a time, with their
// title, personality (which can go back to the original), picture, and
// Tataru's bio. Provided by the admin's characters window.
export const AdminCharactersStore = signalStore(
  withState<AdminCharactersState>({
    characters: null,
    limits: null,
    selectedId: null,
    busy: false,
    status: '',
    error: null,
  }),
  withComputed((store) => ({
    selected: computed(() => store.characters()?.find((c) => c.id === store.selectedId()) ?? null),
  })),
  withMethods((store, admin = inject(AdminService)) => {
    // A change sent to the backend; `done` says what happened, e.g.
    // "Barnaby's changes are saved."
    const run = rxMethod<{ request: Observable<CharacterResponse>; done: string }>(
      pipe(
        tap(() => patchState(store, { busy: true, status: '', error: null })),
        exhaustMap(({ request, done }) =>
          request.pipe(
            tapResponse({
              next: ({ character }) =>
                patchState(store, ({ characters }) => ({
                  characters: characters?.map((c) => (c.id === character.id ? character : c)) ?? null,
                  busy: false,
                  status: done,
                })),
              error: (error: unknown) => patchState(store, { busy: false, error: serverMessage(error) }),
            }),
          ),
        ),
      ),
    );
    const nameOf = (character: CharacterSettings) => firstName(character.name);
    return {
      firstName,
      load: rxMethod<void>(
        pipe(
          switchMap(() =>
            admin.characters().pipe(
              tapResponse({
                next: ({ characters, limits }) =>
                  patchState(store, {
                    characters,
                    limits,
                    selectedId: store.selectedId() ?? characters[0]?.id ?? null,
                  }),
                error: (error: unknown) => patchState(store, { error: serverMessage(error) }),
              }),
            ),
          ),
        ),
      ),
      select: (id: string) => patchState(store, { selectedId: id, status: '', error: null }),
      save: (changes: CharacterChanges) => {
        const character = store.selected();
        if (character) {
          run({
            request: admin.updateCharacter(character.id, changes),
            done: `${nameOf(character)}'s changes are saved.`,
          });
        }
      },
      // Back to the personality the site ships with.
      restorePersona: () => {
        const character = store.selected();
        if (character) {
          run({
            request: admin.updateCharacter(character.id, { persona: '' }),
            done: `${nameOf(character)}'s original personality is back.`,
          });
        }
      },
      uploadPicture: (picture: Blob) => {
        const character = store.selected();
        if (character) {
          run({
            request: admin.uploadCharacterPicture(character.id, picture),
            done: `${nameOf(character)}'s new picture is saved.`,
          });
        }
      },
      setError: (error: string | null) => patchState(store, { error }),
    };
  }),
  withHooks({ onInit: (store) => store.load() }),
);

// The first word of a long name is enough on a tab ("Barnaby").
function firstName(name: string) {
  return name.split(' ')[0];
}
