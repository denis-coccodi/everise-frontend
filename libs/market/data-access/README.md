# market-data-access

The Market History page's data: `MarketService` (`GET /api/market/regions`, `/market/items?search=`, `/market/items/:id` and `/market/history`, the backend's reading of Universalis), `MarketSearchStore` (the item search, 300 ms after the last key) and `MarketStore`, the page's state:

- the item, the region, and Oceania's worlds when asked for (any world can visit them);
- each world's days, read again every 4 seconds while older days are still coming in;
- the worlds drawn (at most 8; by default the home world, Odin, and today's cheapest);
- the lowest middle price today and in the days shown.

`market-series.ts` turns the histories into the chart's lines and finds the lowest prices, and keeps the days shown within the history: the last month by default, never before the history starts nor after today. `market-query.ts` keeps everything but the search in the page's query string (`?item=5111&region=europe&oceania=show&worlds=odin,phoenix&quality=hq&from=2024-01-01&to=2026-10-01&scale=log`): the store reads it, writes every change back and follows it on Back, Forward and links. Only another item, region, quality or an earlier first day is read again; the rest is drawn from what's there.
