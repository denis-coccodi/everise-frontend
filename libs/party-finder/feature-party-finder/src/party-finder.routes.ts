import { Routes } from '@angular/router';
import { discordLinkGuard } from '@everise/auth/data-access';
import { dataCentreTitle } from '@everise/core/data-access';
import { PartyFinderComponent } from './lib/party-finder/party-finder.component';
import { PfListingPageComponent } from './lib/pf-listing-page/pf-listing-page.component';

// Open to everyone: the listings are public in the game and on xivpf.
export const PARTY_FINDER_ROUTES: Routes = [
  {
    // Everything the page shows is in its query string
    // (?dc=light&world=odin...), so the title follows it.
    path: '',
    title: dataCentreTitle('Party Finder'),
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    canActivate: [discordLinkGuard],
    component: PartyFinderComponent,
  },
  {
    // One listing's own page, which links share (from the Everise Discord
    // too).
    path: 'listings/:id',
    title: 'Party Finder listing',
    canActivate: [discordLinkGuard],
    component: PfListingPageComponent,
  },
];
