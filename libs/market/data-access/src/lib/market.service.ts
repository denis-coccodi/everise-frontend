import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MarketHistory, MarketItemsResponse, MarketQuality, MarketScopes } from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';

@Injectable({ providedIn: 'root' })
export class MarketService {
  private readonly api = inject(ApiService);

  // The data centres and their worlds, by region.
  scopes() {
    return this.api.get<MarketScopes>('/market/scopes');
  }

  // Items the market board sells whose name has `text`.
  search(text: string) {
    return this.api.get<MarketItemsResponse>('/market/items', new HttpParams().set('search', text));
  }

  // The items with these ids (a link's), in that order.
  items(ids: number[]) {
    return this.api.get<MarketItemsResponse>(`/market/items/${ids.join(',')}`);
  }

  // The items' prices a day in a data centre or on a world.
  history(scope: string, ids: number[], quality: MarketQuality) {
    return this.api.get<MarketHistory>(
      '/market/history',
      new HttpParams().set('scope', scope).set('items', ids.join(',')).set('quality', quality),
    );
  }
}

// An item's icon.
export function iconUrl(apiUrl: string, icon: number) {
  return `${apiUrl}/market/icons/${icon}`;
}
