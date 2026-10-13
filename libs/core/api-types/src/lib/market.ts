import { Schemas } from './schemas';

// An item the market board sells, from XIVAPI (its icon: GET /api/market/icons/:id).
export type MarketItem = Schemas['MarketItem'];
export type MarketItemsResponse = Schemas['MarketItemsResponse'];

// The data centres and worlds whose prices can be read, by region.
export type MarketScopes = Schemas['MarketScopesResponse'];

// Up to 3 items' prices a day in a data centre or on a world (Universalis).
export type MarketHistory = Schemas['MarketHistoryResponse'];
export type MarketItemHistory = MarketHistory['items'][number];
export type MarketDay = MarketItemHistory['days'][number];
export type MarketQuality = MarketHistory['quality'];
