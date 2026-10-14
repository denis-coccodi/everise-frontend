import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  MarketHistory,
  MarketItemResponse,
  MarketItemsResponse,
  MarketQuality,
  MarketRegions,
} from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';

@Injectable({ providedIn: 'root' })
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

  // The item's prices a day on each world of a region, from `from` (YYYY-MM-DD).
  history(region: string, item: number, quality: MarketQuality, from: string) {
    return this.api.get<MarketHistory>(
      '/market/history',
      new HttpParams().set('region', region).set('item', item).set('quality', quality).set('from', from),
    );
  }
}

// An item's icon.
export function iconUrl(apiUrl: string, icon: number) {
  return `${apiUrl}/market/icons/${icon}`;
}
