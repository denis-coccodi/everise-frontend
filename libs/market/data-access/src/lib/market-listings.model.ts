import type { MarketListing } from '@everise/core/api-types';
import type { MarketWorld } from './market-series.model';

// A listing with its world.
export interface WorldListing extends MarketListing {
  place: MarketWorld;
}
