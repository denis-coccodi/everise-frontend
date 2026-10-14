import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject } from '@angular/core';
import { WeeklyResponse } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { interval, pipe, switchMap, tap } from 'rxjs';
import { RelaysService } from './relays.service';

// The countdowns move on this often.
export const WEEKLY_TICK_MS = 30 * 1000;
// The week's posts change twice a week: asked again this often while open.
const WEEKLY_POLL_MS = 10 * 60 * 1000;

interface WeeklyState {
  weekly: WeeklyResponse | null;
  loadState: 'loading' | 'ready' | 'error';
  // The backend's words when the last load failed.
  error: string;
  // The clock for the countdowns and the reports' days.
  now: number;
}

// The Weekly tab: the next resets, this week's Fashion Report and Island
// Sanctuary recommendations. Provided by the tab.
export const WeeklyStore = signalStore(
  withState<WeeklyState>({ weekly: null, loadState: 'loading', error: '', now: Date.now() }),
  withMethods((store, service = inject(RelaysService)) => ({
    load: rxMethod<void>(
      pipe(
        switchMap(() =>
          service.weekly().pipe(
            tapResponse({
              next: (weekly) => patchState(store, { weekly, loadState: 'ready', error: '', now: Date.now() }),
              // A failed refresh keeps what's shown, and says why.
              error: (error: unknown) =>
                patchState(store, { error: serverMessage(error), loadState: store.weekly() ? 'ready' : 'error' }),
            }),
          ),
        ),
      ),
    ),
    tick: () => patchState(store, { now: Date.now() }),
  })),
  withHooks((store) => ({
    onInit() {
      store.load();
      rxMethod<number>(tap(() => document.visibilityState === 'visible' && store.load()))(interval(WEEKLY_POLL_MS));
      rxMethod<number>(tap(() => store.tick()))(interval(WEEKLY_TICK_MS));
    },
  })),
);
