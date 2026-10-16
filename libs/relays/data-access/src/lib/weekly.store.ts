import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withHooks, withMethods, withProps, withState } from '@ngrx/signals';
import { extendResource, withPreviousValueOnError } from '@ngrx/signals/resource';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { errorMessageOf, loadStateOf } from '@everise/core/data-access';
import { interval, tap } from 'rxjs';
import { RelaysService } from './relays.service';

// The countdowns move on this often.
export const WEEKLY_TICK_MS = 30 * 1000;
// The week's posts change twice a week: asked again this often while open.
const WEEKLY_POLL_MS = 10 * 60 * 1000;

// The Weekly tab: the next resets, this week's Fashion Report and Island
// Sanctuary recommendations. Provided by the tab.
export const WeeklyStore = signalStore(
  // The clock for the countdowns and the reports' days.
  withState(() => ({ now: Date.now() })),
  withProps((_, service = inject(RelaysService)) => ({
    // A failed refresh keeps what's shown, and says why.
    _weekly: extendResource(rxResource({ stream: () => service.weekly() }), withPreviousValueOnError()),
  })),
  withComputed(({ _weekly }) => ({
    weekly: computed(() => _weekly.value() ?? null),
    loadState: computed(() => loadStateOf(_weekly)),
    // The backend's words when the last load failed.
    error: computed(() => errorMessageOf(_weekly)),
  })),
  withMethods((store) => ({
    load: () => store._weekly.reload(),
    tick: () => patchState(store, { now: Date.now() }),
  })),
  withHooks((store) => ({
    onInit() {
      rxMethod<number>(tap(() => document.visibilityState === 'visible' && store.load()))(interval(WEEKLY_POLL_MS));
      rxMethod<number>(tap(() => store.tick()))(interval(WEEKLY_TICK_MS));
    },
  })),
);
