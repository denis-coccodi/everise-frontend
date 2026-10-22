import { HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  MarketHistory,
  MarketItemResponse,
  MarketItemsResponse,
  MarketListings,
  MarketQuality,
  MarketRegions,
} from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';

@Service()
export class MarketService {
  private readonly api = inject(ApiService);

  // The regions, their data centres and worlds.
  regions() {
    return this.api.get<MarketRegions>('/market/regions');
  }

  // Items the market board sells whose name has `text`.
  search(text: string) {
    return this.api.get<MarketItemsResponse>('/market/items', new HttpParams().set('search', text));
  }

  // The item with this id (a link's).
  item(id: number) {
    return this.api.get<MarketItemResponse>(`/market/items/${id}`);
  }

  // The item's prices a day on each world of a region, from `from` to `to`
  // (YYYY-MM-DD; none: to today).
  history(region: string, item: number, quality: MarketQuality, from: string, to: string | null = null) {
    const params = new HttpParams().set('region', region).set('item', item).set('quality', quality).set('from', from);
    return this.api.get<MarketHistory>('/market/history', to ? params.set('to', to) : params);
  }

  // The item's cheapest listings now on the worlds of a region.
  listings(region: string, item: number, quality: MarketQuality) {
    return this.api.get<MarketListings>(
      '/market/listings',
      new HttpParams().set('region', region).set('item', item).set('quality', quality),
    );
  }
}

// An item's icon.
export function iconUrl(apiUrl: string, icon: number) {
  return `${apiUrl}/market/icons/${icon}`;
}
