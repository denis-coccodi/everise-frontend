import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { MarketItem } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { EMPTY, debounceTime, distinctUntilChanged, pipe, switchMap, tap } from 'rxjs';
import { MarketService } from './market.service';

// The search waits this long after the last key.
export const SEARCH_DELAY_MS = 300;

interface MarketSearchState {
  text: string;
  results: MarketItem[];
  state: 'idle' | 'searching' | 'done' | 'error';
  error: string;
}

// The market history page's item search: items the market board sells
// whose name has what was typed (2 letters or more), once the typing stops.
// Provided by the page.
export const MarketSearchStore = signalStore(
  withState<MarketSearchState>({ text: '', results: [], state: 'idle', error: '' }),
  withMethods((store, service = inject(MarketService)) => ({
    search: rxMethod<string>(
      pipe(
        tap((text) => patchState(store, { text })),
        debounceTime(SEARCH_DELAY_MS),
        distinctUntilChanged(),
        switchMap((text) => {
          if (text.trim().length < 2) {
            patchState(store, { results: [], state: 'idle', error: '' });
            return EMPTY;
          }
          patchState(store, { state: 'searching' });
          return service.search(text.trim()).pipe(
            tapResponse({
              next: ({ items }) => patchState(store, { results: items, state: 'done', error: '' }),
              error: (error: unknown) =>
                patchState(store, { results: [], state: 'error', error: serverMessage(error) }),
            }),
          );
        }),
      ),
    ),
  })),
);
