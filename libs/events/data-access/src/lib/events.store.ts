import { computed, effect, inject, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { patchState, signalStore, withComputed, withHooks, withMethods, withProps, withState } from '@ngrx/signals';
import { extendResource, withPreviousValueOnError } from '@ngrx/signals/resource';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { CommunityEvent } from '@everise/core/api-types';
import { errorMessageOf, matchesSearch } from '@everise/core/data-access';
import { interval, map, pipe, tap } from 'rxjs';
import { dayHeading, dayKey, isLive } from './event-time';
import { eventDataCentre } from './events-query';
import { EventsService } from './events.service';

// The page asks again this often while it's in view (the backend reads
// Partake at most every five minutes).
export const EVENTS_POLL_MS = 5 * 60 * 1000;
// "On now" moves on this often.
const TICK_MS = 60 * 1000;

interface EventsState {
  // The data centre shown, from the query string (?dc=light); null for all.
  dataCentre: string | null;
  // The words typed in the search box, from the query string (?search=dj).
  search: string;
  now: number;
}

function initialState(): EventsState {
  const query = inject(ActivatedRoute, { optional: true })?.snapshot.queryParamMap;
  return {
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
  withProps((_, service = inject(EventsService)) => {
    // A failed refresh keeps what's shown (value() doesn't throw), and says why.
    const list = extendResource(rxResource({ stream: () => service.events() }), withPreviousValueOnError());
    // The page reads the load itself: hasValue(), isLoading(), error().
    return { _list: list, list: list.asReadonly() };
  }),
  withComputed((store) => {
    // Events that haven't ended since the backend read them.
    const current = computed(() =>
      (store.list.value()?.events ?? []).filter((event) => Date.parse(event.endsAt) > store.now()),
    );
    const shown = computed(() =>
      current().filter(
        (event) =>
          (!store.dataCentre() || event.dataCentre === store.dataCentre()) &&
          matchesSearch(store.search(), searchedText(event)),
      ),
    );
    return {
      // The backend's words when the last load failed.
      error: computed(() => errorMessageOf(store._list)),
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
  withMethods((store, router = inject(Router)) => {
    const route = inject(ActivatedRoute, { optional: true });
    return {
      // The poll, and "Try again" after a failed load (the page shows it
      // loading while there's nothing to show).
      refresh: () => store._list.reload(),
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
      // Each answer is measured against the time it came.
      effect(() => {
        if (store._list.status() === 'resolved') untracked(() => store.tick());
      });
      if (route) store.followQuery(route.queryParamMap);
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
