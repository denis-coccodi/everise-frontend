import { Routes } from '@angular/router';
import { discordLinkGuard } from '@everise/auth/data-access';
import { dataCentreTitle } from '@everise/core/data-access';
import { VenuePageComponent } from './lib/venue-page/venue-page.component';
import { VenuesComponent } from './lib/venues/venues.component';

// The community's player-run venues, from FFXIV Venues; open to everyone.
export const VENUES_ROUTES: Routes = [
  {
    // A data centre's venues (?dc=chaos); the title follows the data centre.
    path: '',
    title: dataCentreTitle('Venues'),
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    component: VenuesComponent,
  },
  {
    // One venue's own page, which venue cards and shares in the Everise
    // Discord open (the page names the venue once loaded).
    path: ':id',
    title: 'Venue',
    canActivate: [discordLinkGuard],
    component: VenuePageComponent,
  },
];
