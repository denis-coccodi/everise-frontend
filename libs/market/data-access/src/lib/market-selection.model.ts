import type { MarketQuality } from '@everise/core/api-types';

export interface MarketSelection {
  item: number | null;
  region: string;
  oceania: boolean;
  // World names in lower case.
  worlds: string[];
  quality: MarketQuality;
  // The first and last day shown (YYYY-MM-DD); null: a month ago, today.
  from: string | null;
  to: string | null;
  scale: PriceScale;
}

export type PriceScale = 'linear' | 'log';
