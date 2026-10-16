import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EventDetail, EventVenue } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { interval, map, pipe, switchMap, tap } from 'rxjs';
import { EventsService } from './events.service';

// "On now" moves on this often.
const TICK_MS = 60 * 1000;

interface EventPageState {
  // The event's id, from the address.
  id: string;
  event: EventDetail | null;
  // The venue on the site it is held at, when the backend is sure of it.
  venue: EventVenue | null;
  // 'missing': the backend says the site doesn't list it (or the address
  // names no event).
  loadState: 'loading' | 'ready' | 'missing' | 'error';
  // Why it's missing, or why loading failed, in the backend's words.
  error: string;
  now: number;
}

const initialState: EventPageState = {
  id: '',
  event: null,
  venue: null,
  loadState: 'loading',
  error: '',
  now: Date.now(),
};

// One event's own page (/events/<id>): the event as the backend last read
// it from Partake. Provided by the page.
export const EventPageStore = signalStore(
  withState<EventPageState>(initialState),
  withMethods((store, service = inject(EventsService)) => ({
    load: rxMethod<string>(
      pipe(
        tap((id) => patchState(store, { ...initialState, id, now: Date.now() })),
        switchMap((id) =>
          service.event(id).pipe(
            tapResponse({
              next: ({ event, venue }) => patchState(store, { event, venue, loadState: 'ready', now: Date.now() }),
              error: (error: unknown) => {
                const missing = error instanceof HttpErrorResponse && (error.status === 404 || error.status === 422);
                patchState(store, { error: serverMessage(error), loadState: missing ? 'missing' : 'error' });
              },
            }),
          ),
        ),
      ),
    ),
    tick: () => patchState(store, { now: Date.now() }),
  })),
  withHooks((store, route = inject(ActivatedRoute)) => ({
    onInit() {
      store.load(route.paramMap.pipe(map((params: ParamMap) => params.get('id') ?? '')));
      rxMethod<number>(tap(() => store.tick()))(interval(TICK_MS));
    },
  })),
);
