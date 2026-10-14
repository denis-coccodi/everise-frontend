import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { HuntsResponse } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { fromEvent, interval, pipe, switchMap, tap } from 'rxjs';
import { RelaysService } from './relays.service';

// The backend reads the hunt channels every 2 minutes: asked again this
// often while the tab is in view.
export const HUNTS_POLL_MS = 60 * 1000;
// "Starts in 5 min" moves on this often.
const HUNTS_TICK_MS = 15 * 1000;

interface HuntsState {
  hunts: HuntsResponse | null;
  loadState: 'loading' | 'ready' | 'error';
  error: string;
  // When the tab last heard back, and the clock for the trains' times.
  checkedAt: number;
  now: number;
}

// The Hunts tab: the hunt trains to come, running and last started, a
// section per data centre, in the backend's order (Light first). Provided
// by the tab.
export const HuntsStore = signalStore(
  withState<HuntsState>({ hunts: null, loadState: 'loading', error: '', checkedAt: 0, now: Date.now() }),
  withComputed((store) => ({
    sections: computed(() => {
      const hunts = store.hunts();
      if (!hunts) return [];
      return hunts.dataCentres.map((dataCentre) => ({
        dataCentre,
        trains: hunts.posts.filter((post) => post.dataCentre === dataCentre),
      }));
    }),
  })),
  withMethods((store, service = inject(RelaysService)) => {
    const load = rxMethod<void>(
      pipe(
        switchMap(() =>
          service.hunts().pipe(
            tapResponse({
              next: (hunts) =>
                patchState(store, { hunts, loadState: 'ready', error: '', checkedAt: Date.now(), now: Date.now() }),
              error: (error: unknown) =>
                patchState(store, { error: serverMessage(error), loadState: store.hunts() ? 'ready' : 'error' }),
            }),
          ),
        ),
      ),
    );
    return {
      load,
      tick: () => patchState(store, { now: Date.now() }),
      // Asks again if the list is older than a poll, e.g. back from another tab.
      refreshIfStale() {
        if (document.visibilityState === 'visible' && Date.now() - store.checkedAt() >= HUNTS_POLL_MS) load();
      },
    };
  }),
  withHooks((store) => ({
    onInit() {
      store.load();
      rxMethod<number>(tap(() => document.visibilityState === 'visible' && store.load()))(interval(HUNTS_POLL_MS));
      rxMethod<Event>(tap(() => store.refreshIfStale()))(fromEvent(document, 'visibilitychange'));
      rxMethod<number>(tap(() => store.tick()))(interval(HUNTS_TICK_MS));
    },
  })),
);
