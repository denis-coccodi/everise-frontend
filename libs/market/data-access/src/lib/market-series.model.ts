import type { MarketDay } from '@everise/core/api-types';
import './market-series';

// A world the page can draw: its game id, its name and its id in links
// (the name in lower case), and where it is.
export interface MarketWorld {
  id: number;
  name: string;
  key: string;
  dataCentre: string;
  region: string;
}

// A world's line on the chart: its days within the range, each at its date.
export interface PriceSeries {
  world: MarketWorld;
  points: { at: number; value: number; day: MarketDay }[];
}

// A world's day with its world, for the lowest prices.
export interface WorldDay extends MarketDay {
  world: MarketWorld;
}

// The days shown: both ends included, as YYYY-MM-DD.
export interface DayRange {
  from: string;
  to: string;
}
