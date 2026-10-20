import { computed, effect, inject, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withHooks, withMethods, withProps, withState } from '@ngrx/signals';
import { extendResource, withPreviousValueOnError } from '@ngrx/signals/resource';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { errorMessageOf } from '@everise/core/data-access';
import { fromEvent, interval, tap } from 'rxjs';
import { RelaysService } from './relays.service';

// The backend reads the hunt channels every 2 minutes: asked again this
// often while the tab is in view.
export const HUNTS_POLL_MS = 60 * 1000;
// "Starts in 5 min" moves on this often.
const HUNTS_TICK_MS = 15 * 1000;

interface HuntsState {
  // When the tab last heard back, and the clock for the trains' times.
  checkedAt: number;
  now: number;
}

// The Hunts tab: the hunt trains to come, running and last started, a
// section per data centre, in the backend's order (Light first). Provided
// by the tab.
export const HuntsStore = signalStore(
  withState<HuntsState>(() => ({ checkedAt: 0, now: Date.now() })),
  withProps((_, service = inject(RelaysService)) => {
    // A failed refresh keeps what's shown (value() doesn't throw), and says why.
    const hunts = extendResource(rxResource({ stream: () => service.hunts() }), withPreviousValueOnError());
    // The tab reads the load itself: value(), isLoading(), error().
    return { _hunts: hunts, hunts: hunts.asReadonly() };
  }),
  withComputed(({ _hunts }) => ({
    // The backend's words when the last load failed.
    error: computed(() => errorMessageOf(_hunts)),
    sections: computed(() => {
      const hunts = _hunts.value();
      if (!hunts) return [];
      return hunts.dataCentres.map((dataCentre) => ({
        dataCentre,
        trains: hunts.posts.filter((post) => post.dataCentre === dataCentre),
      }));
    }),
  })),
  withMethods((store) => ({
    load: () => store._hunts.reload(),
    tick: () => patchState(store, { now: Date.now() }),
    // Asks again if the list is older than a poll, e.g. back from another tab.
    refreshIfStale() {
      if (document.visibilityState === 'visible' && Date.now() - store.checkedAt() >= HUNTS_POLL_MS) {
        store._hunts.reload();
      }
    },
  })),
  withHooks((store) => ({
    onInit() {
      effect(() => {
        if (store._hunts.status() === 'resolved') {
          untracked(() => patchState(store, { checkedAt: Date.now(), now: Date.now() }));
        }
      });
      rxMethod<number>(tap(() => document.visibilityState === 'visible' && store.load()))(interval(HUNTS_POLL_MS));
      rxMethod<Event>(tap(() => store.refreshIfStale()))(fromEvent(document, 'visibilitychange'));
      rxMethod<number>(tap(() => store.tick()))(interval(HUNTS_TICK_MS));
    },
  })),
);
