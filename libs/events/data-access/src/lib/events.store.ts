import { computed, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { CommunityEvent, EventList } from '@everise/core/api-types';
import { matchesSearch } from '@everise/core/data-access';
import { serverMessage } from '@everise/core/forms';
import { interval, map, pipe, switchMap, tap } from 'rxjs';
import { dayHeading, dayKey, isLive } from './event-time';
import { eventDataCentre } from './events-query';
import { EventsService } from './events.service';

// The page asks again this often while it's in view (the backend reads
// Partake at most every five minutes).
export const EVENTS_POLL_MS = 5 * 60 * 1000;
// "On now" moves on this often.
const TICK_MS = 60 * 1000;

interface EventsState {
  list: EventList | null;
  loadState: 'loading' | 'ready' | 'error';
  // The backend's words when the last load failed.
  error: string;
  // The data centre shown, from the query string (?dc=light); null for all.
  dataCentre: string | null;
  // The words typed in the search box, from the query string (?search=dj).
  search: string;
  now: number;
}

function initialState(): EventsState {
  const query = inject(ActivatedRoute, { optional: true })?.snapshot.queryParamMap;
  return {
    list: null,
    loadState: 'loading',
    error: '',
    dataCentre: eventDataCentre(query ?? { get: () => null }),
    search: query?.get('search') ?? '',
    now: Date.now(),
  };
}

// The Events page's state: the week's events, those going on now apart
// from the rest, which are grouped by the day they start; one data
// centre's or every one's, those matching the search. Refreshed while the
// page is in view. Provided by the page.
export const EventsStore = signalStore(
  withState<EventsState>(initialState),
  withComputed((store) => {
    // Events that haven't ended since the backend read them.
    const current = computed(() =>
      (store.list()?.events ?? []).filter((event) => Date.parse(event.endsAt) > store.now()),
    );
    const shown = computed(() =>
      current().filter(
        (event) =>
          (!store.dataCentre() || event.dataCentre === store.dataCentre()) &&
          matchesSearch(store.search(), searchedText(event)),
      ),
    );
    return {
      liveNow: computed(() => shown().filter((event) => isLive(event, store.now()))),
      days: computed(() =>
        byDay(
          shown().filter((event) => !isLive(event, store.now())),
          store.now(),
        ),
      ),
      total: computed(() => shown().length),
      // The data centres with events this week, in order, for the picker;
      // the one shown stays there even with none left.
      dataCentres: computed(() => {
        const names = new Set(current().flatMap((event) => (event.dataCentre ? [event.dataCentre] : [])));
        const picked = store.dataCentre();
        if (picked) names.add(picked);
        return [...names].sort((a, b) => a.localeCompare(b));
      }),
    };
  }),
  withMethods((store, service = inject(EventsService), router = inject(Router)) => {
    const route = inject(ActivatedRoute, { optional: true });
    const load = rxMethod<void>(
      pipe(
        switchMap(() =>
          service.events().pipe(
            tapResponse({
              next: (list) => patchState(store, { list, loadState: 'ready', error: '', now: Date.now() }),
              // A failed refresh keeps what's shown, and says why.
              error: (error: unknown) =>
                patchState(store, { error: serverMessage(error), loadState: store.list() ? 'ready' : 'error' }),
            }),
          ),
        ),
      ),
    );
    return {
      refresh: () => load(),
      // Asked for again after a failed load: the page shows it loading.
      retry: () => {
        patchState(store, { loadState: store.list() ? 'ready' : 'loading', error: '' });
        load();
      },
      // Typed in the search box: shown at once, and kept in the query string
      // (the same history entry), so a link brings it along.
      setSearch: (search: string) => {
        patchState(store, { search });
        if (!route) return;
        void router.navigate([], {
          relativeTo: route,
          queryParams: { search: search.trim() || null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      },
      // The query string changed (a data centre's link, Back, Forward): the
      // list is the same, only what's shown changes. The box keeps what was
      // typed (spaces too) while the address catches up.
      followQuery: rxMethod<ParamMap>(
        pipe(
          map((query) => ({ dataCentre: eventDataCentre(query), search: query.get('search') ?? '' })),
          tap(({ dataCentre, search }) =>
            patchState(store, { dataCentre, ...(search.trim() !== store.search().trim() && { search }) }),
          ),
        ),
      ),
      tick: () => patchState(store, { now: Date.now() }),
    };
  }),
  withHooks((store, route = inject(ActivatedRoute, { optional: true })) => ({
    onInit() {
      if (route) store.followQuery(route.queryParamMap);
      store.refresh();
      rxMethod<number>(tap(() => document.visibilityState === 'visible' && store.refresh()))(interval(EVENTS_POLL_MS));
      rxMethod<number>(tap(() => store.tick()))(interval(TICK_MS));
    },
  })),
);

// What the search box looks in.
function searchedText(event: CommunityEvent) {
  return [event.title, event.team?.name, event.world, event.location, event.dataCentre, ...event.tags, event.summary];
}

// The events in order, under the day each starts on.
function byDay(events: CommunityEvent[], now: number) {
  const days: { key: string; heading: string; events: CommunityEvent[] }[] = [];
  for (const event of [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = dayKey(event.startsAt);
    const day = days.at(-1);
    if (day?.key === key) day.events.push(event);
    else days.push({ key, heading: dayHeading(event.startsAt, now), events: [event] });
  }
  return days;
}
