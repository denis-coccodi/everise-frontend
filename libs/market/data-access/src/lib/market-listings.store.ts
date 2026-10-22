import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { MarketListings, MarketQuality } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import { EMPTY, forkJoin, switchMap } from 'rxjs';
import { MarketStore } from './market.store';
import { MarketService } from './market.service';
import type { WorldListing } from './market-listings.model';

// Listings shown: the cheapest first.
const SHOWN = 5;

interface MarketListingsState {
  // The region's listings, then Oceania's when asked for.
  answers: MarketListings[];
  state: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
}

interface ListingsKey {
  item: number;
  regions: string[];
  quality: MarketQuality;
}

// The market history page's cheapest listings now, on any world drawn
// from: read once for each item, region (and Oceania) and quality the
// page's MarketStore shows (sellers undercut each other, so the cheapest
// is usually the newest; the page reads them again when opened). Provided
// by the page, with MarketStore.
export const MarketListingsStore = signalStore(
  withState<MarketListingsState>({ answers: [], state: 'idle', error: '' }),
  withComputed((store, market = inject(MarketStore)) => ({
    cheapest: computed<WorldListing[]>(() =>
      store
        .answers()
        .flatMap((answer) => answer.listings)
        .sort((a, b) => a.price - b.price)
        .flatMap((listing) => {
          const place = market.allWorlds().find((world) => world.id === listing.world);
          return place ? [{ ...listing, place }] : [];
        })
        .slice(0, SHOWN),
    ),
  })),
  withMethods((store, service = inject(MarketService)) => ({
    load: rxMethod<ListingsKey | null>(
      switchMap((key) => {
        if (key === null) {
          patchState(store, { answers: [], state: 'idle', error: '' });
          return EMPTY;
        }
        patchState(store, { answers: [], state: 'loading' });
        return forkJoin(key.regions.map((region) => service.listings(region, key.item, key.quality))).pipe(
          tapResponse({
            next: (answers) => patchState(store, { answers, state: 'ready', error: '' }),
            error: (error: unknown) => patchState(store, { state: 'error', error: serverMessage(error) }),
          }),
        );
      }),
    ),
  })),
  withHooks((store, market = inject(MarketStore)) => ({
    onInit() {
      // Read again whenever the item, regions or quality change.
      store.load(
        computed(
          () => {
            const item = market.item();
            return item === null ? null : { item, regions: market.readRegions(), quality: market.quality() };
          },
          { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
        ),
      );
    },
  })),
);
