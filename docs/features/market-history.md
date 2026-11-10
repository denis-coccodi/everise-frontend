---
title: Market History
parent: Features
nav_order: 5
---

# Market History

Backend: [Market History](/docs/backend/features/market-history.html).

`/market-history` is for signed-in members. Guests see what it does and a way to sign up.

## Libraries

- **`market/feature-market`** (`MarketComponent`):
  - **The chart:** one item's price over time on every world of a region, a line per world, drawn with `<cdt-line-chart>` from the UI library. Each point is a world's median sale price that day, and lines join across days without sales.
  - **Above the chart:** the cheapest listing now, and the lowest median price today and in the days shown, with its world.
  - **`cdt-market-item-picker`:** searches items by name.
  - **`cdt-market-controls`:** the region (and Oceania), the sales (all, NQ, HQ), the days (dates or a quick range, a month by default), and a logarithmic price axis.
  - **`cdt-market-worlds`:** picks the worlds drawn, by data centre.
- **`market/data-access`:**
  - `MarketSearchStore` searches 300 ms after the last key.
  - `MarketStore` holds the item, the region, each world's days, and the worlds drawn: at most 8, by default the home world (Odin) and today's cheapest.
  - `market-series.ts` turns the histories into lines and finds the lowest prices.

## Loading a long history

The backend reads a history in steps. While it's `complete: false`, the store asks again every 2 seconds for only the days not yet received (`to` is how far back every world was read), and the chart fills in as they arrive.

## State in the address

Everything but the search is in the query string (`market-query.ts`), so a link shows anyone the same chart:

```
?item=5111&region=europe&oceania=show&worlds=odin,phoenix&quality=hq&from=2024-01-01&to=2026-10-01&scale=log
```

Only another item, region, quality or an earlier first day is read again; the rest is drawn from what's already there.
