import { Schemas } from './schemas';

// An item the market board sells, from XIVAPI (its icon: GET /api/market/icons/:id).
export type MarketItem = Schemas['MarketItem'];
export type MarketItemsResponse = Schemas['MarketItemsResponse'];
export type MarketItemResponse = Schemas['MarketItemResponse'];

// The regions, their data centres and worlds, and where the page starts.
export type MarketRegions = Schemas['MarketRegionsResponse'];
export type MarketRegion = MarketRegions['regions'][number];

// An item's prices a day on each world of a region (Universalis).
export type MarketHistory = Schemas['MarketHistoryResponse'];
export type MarketWorldHistory = MarketHistory['worlds'][number];
export type MarketDay = MarketWorldHistory['days'][number];
export type MarketQuality = MarketHistory['quality'];
