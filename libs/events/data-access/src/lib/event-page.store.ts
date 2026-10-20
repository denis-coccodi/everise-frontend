import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { patchState, signalStore, withComputed, withHooks, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { errorMessageOf } from '@everise/core/data-access';
import { interval, map, tap } from 'rxjs';
import { EventsService } from './events.service';

// "On now" moves on this often.
const TICK_MS = 60 * 1000;

// One event's own page (/events/<id>): the event as the backend last read
// it from Partake. Provided by the page.
export const EventPageStore = signalStore(
  withState(() => ({ now: Date.now() })),
  withProps((_, service = inject(EventsService), route = inject(ActivatedRoute)) => {
    // The event's id, from the address; another id loads afresh.
    const id = toSignal(route.paramMap.pipe(map((params) => params.get('id') ?? '')), { requireSync: true });
    const page = rxResource({ params: id, stream: ({ params }) => service.event(params) });
    // Read-only: nothing here reloads it. The page reads the load itself:
    // hasValue(), isLoading(), error().
    return { page: page.asReadonly() };
  }),
  withComputed(({ page }) => ({
    event: computed(() => (page.hasValue() ? page.value().event : null)),
    // The venue on the site it is held at, when the backend is sure of it.
    venue: computed(() => (page.hasValue() ? page.value().venue ?? null : null)),
    // The backend says the site doesn't list it (or the address names no
    // event).
    missing: computed(() => isMissing(page.error())),
    // Why it's missing, or why loading failed, in the backend's words.
    error: computed(() => errorMessageOf(page)),
  })),
  withMethods((store) => ({
    tick: () => patchState(store, { now: Date.now() }),
  })),
  withHooks((store) => ({
    onInit() {
      rxMethod<number>(tap(() => store.tick()))(interval(TICK_MS));
    },
  })),
);

function isMissing(error: Error | undefined) {
  return error instanceof HttpErrorResponse && (error.status === 404 || error.status === 422);
}
