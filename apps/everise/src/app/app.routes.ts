import { Routes } from '@angular/router';
import { AuthGuard, discordLinkGuard } from '@everise/auth/data-access';
import { environment } from '../environments/environment';

// The site's pages. Each feature's own routes are in its library
// (<feature>.routes.ts), loaded the first time one of its pages opens.
export const APP_ROUTES: Routes = [
  {
    // The home page is the site's own address (/), its canonical one;
    // /home, its old address, leads there.
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('@everise/home/feature-home').then((m) => m.HOME_ROUTES),
  },
  { path: 'home', redirectTo: '' },
  {
    path: 'article',
    title: 'Article',
    // A post linked from the Everise Discord asks for sign-in first.
    canActivate: [discordLinkGuard],
    loadChildren: () => import('@everise/articles/article').then((m) => m.ARTICLE_ROUTES),
  },
  {
    path: 'roulette',
    loadChildren: () => import('@everise/roulette/feature-roulette').then((m) => m.ROULETTE_ROUTES),
  },
  {
    path: 'waking-sands',
    loadChildren: () => import('@everise/waking-sands/feature-waking-sands').then((m) => m.WAKING_SANDS_ROUTES),
  },
  {
    path: 'party-finder',
    loadChildren: () => import('@everise/party-finder/feature-party-finder').then((m) => m.PARTY_FINDER_ROUTES),
  },
  {
    path: 'venues',
    loadChildren: () => import('@everise/venues/feature-venues').then((m) => m.VENUES_ROUTES),
  },
  {
    path: 'events',
    loadChildren: () => import('@everise/events/feature-events').then((m) => m.EVENTS_ROUTES),
  },
  {
    path: 'market-history',
    loadChildren: () => import('@everise/market/feature-market').then((m) => m.MARKET_ROUTES),
  },
  // Still being built, so only where it's switched on (the trunk-based skill).
  ...(environment.features.planner
    ? [
        {
          path: 'planner',
          loadChildren: () => import('@everise/planner/feature-planner').then((m) => m.PLANNER_ROUTES),
        },
      ]
    : []),
  {
    path: 'settings',
    canActivate: [AuthGuard],
    loadChildren: () => import('@everise/settings/feature-settings').then((m) => m.SETTINGS_ROUTES),
  },
  {
    path: 'editor',
    canActivate: [AuthGuard],
    loadChildren: () => import('@everise/articles/article-edit').then((m) => m.ARTICLE_EDIT_ROUTES),
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadChildren: () => import('@everise/profile/feature-profile').then((m) => m.PROFILE_ROUTES),
  },
  {
    // Signing in and up, the email links and the privacy policy, at the top
    // level (/login, /register...). Last before the catch-all: an address no
    // other route takes is looked for here.
    path: '',
    loadChildren: () => import('@everise/auth/feature-auth').then((m) => m.AUTH_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
