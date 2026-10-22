import { Routes } from '@angular/router';
import { MarketComponent } from './lib/market/market.component';

export const MARKET_ROUTES: Routes = [
  {
    // An item's prices over time on each world of a region; what's picked is
    // in the query string (?item=5111&region=europe). Open to everyone, who
    // can read what it does; the tool itself, and the API behind it, are for
    // members (each look reads Universalis).
    path: '',
    title: 'Market History',
    component: MarketComponent,
  },
];
