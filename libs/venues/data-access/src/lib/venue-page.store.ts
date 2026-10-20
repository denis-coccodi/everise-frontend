import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { patchState, signalStore, withComputed, withHooks, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { errorMessageOf } from '@everise/core/data-access';
import { interval, map, tap } from 'rxjs';
import { VenuesService } from './venues.service';

// "Open now" moves on this often.
const TICK_MS = 60 * 1000;

// One venue's own page (/venues/<id>): the venue as the backend last read
// it from FFXIV Venues. Provided by the page.
export const VenuePageStore = signalStore(
  withState(() => ({ now: Date.now() })),
  withProps((_, service = inject(VenuesService), route = inject(ActivatedRoute)) => {
    // The venue's id, from the address; another id loads afresh.
    const id = toSignal(route.paramMap.pipe(map((params) => params.get('id') ?? '')), { requireSync: true });
    const page = rxResource({ params: id, stream: ({ params }) => service.venue(params) });
    // The page reads the load itself: hasValue(), isLoading(), error().
    return { _page: page, page: page.asReadonly() };
  }),
  withComputed(({ _page }) => ({
    venue: computed(() => (_page.hasValue() ? _page.value().venue : null)),
    // The week's events surely held there, from Partake.
    events: computed(() => (_page.hasValue() ? _page.value().events : [])),
    // The backend says the site doesn't list it.
    missing: computed(() => {
      const error = _page.error();
      return error instanceof HttpErrorResponse && error.status === 404;
    }),
    // Why it's missing, or why loading failed, in the backend's words.
    error: computed(() => errorMessageOf(_page)),
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
