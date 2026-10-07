import { signalStore, withState, withMethods, patchState, withHooks } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject } from '@angular/core';
import { pipe, switchMap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { TagsService } from './tags.service';

export interface TagsState {
  tags: string[];
}

// The popular tags. Provided by the page that shows them (the home page), so
// they load when it opens.
export const TagsStore = signalStore(
  withState<TagsState>({ tags: [] }),
  withMethods((store, tagsService = inject(TagsService)) => ({
    loadTags: rxMethod<void>(
      pipe(
        switchMap(() =>
          tagsService.getTags().pipe(
            tapResponse({
              next: ({ tags }) => patchState(store, { tags }),
              // The list is a shortcut; without it the page still works.
              error: () => patchState(store, { tags: [] }),
            }),
          ),
        ),
      ),
    ),
  })),
  withHooks({
    onInit({ loadTags }) {
      loadTags();
    },
  }),
);
