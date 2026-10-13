# market-data-access

The market page's data: `MarketService` (`GET /api/market/scopes`, `/market/items?search=`, `/market/items/:ids` and `/market/history`, the backend's reading of Universalis) and `MarketStore`, the page's state:

- the items compared (up to 3, `MAX_ITEMS`), with their names and icons;
- the world or data centre, and which sales (all, normal or high quality);
- each item's days, read again every 4 seconds while older days are still coming in;
- the item search, waiting 300 ms after the last key.

`market-series.ts` turns the history into the chart's lines and keeps the days shown within it: never before the first day with sales (where Universalis' history starts), nor after today. `market-query.ts` keeps everything but the search in the page's query string, by id (`?items=5111,5057&scope=odin&quality=hq&from=2024-01-01&to=2026-10-01&scale=log`): the store reads it, writes every change back and follows it on Back, Forward and links. Without a place the page starts on Odin, with nothing picked.
