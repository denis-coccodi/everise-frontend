import type { MarketHistory, MarketItem, MarketRegions } from '@everise/core/api-types';
import type { MarketSelection } from './market-selection.model';

// What the market history page shows (MarketStore), besides what's picked.
export interface MarketState extends MarketSelection {
  // The item picked, once known.
  known: MarketItem | null;
  // The region's history, then Oceania's when asked for.
  histories: MarketHistory[];
  loadState: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  regions: MarketRegions | null;
}
