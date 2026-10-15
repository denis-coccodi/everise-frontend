import { IsActiveMatchOptions, Params } from '@angular/router';
import { IconName } from '@everise/ui/components';

// A page in the navbar: its name, its icon and where it opens.
export interface NavPage {
  label: string;
  icon: IconName;
  path: string;
  query?: Params;
}

// Pages that go together, under one menu in the bar.
export interface NavGroup {
  label: string;
  pages: NavPage[];
}

// The site's pages after Home, by what they are for: being with other
// players, and tools for playing. A new page joins a group, so the bar keeps
// its width.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Community',
    pages: [
      // The Party Finder opens on Everise's home, Light from Odin
      // (party-finder/data-access's party-finder-query.ts).
      { label: 'Party Finder', icon: 'party', path: '/party-finder', query: { dc: 'light', world: 'odin' } },
      { label: 'Venues', icon: 'venue', path: '/venues' },
      { label: 'The Waking Sands', icon: 'chat', path: '/waking-sands' },
    ],
  },
  {
    label: 'Tools',
    pages: [
      // The roulette opens with the everyday content ticked: Dungeons,
      // Trials — Normal and Raids — Normal, by the backend's duty group ids
      // (roulette/data-access's settings-query.ts). Kept here rather than
      // imported, so the roulette's code stays out of the main bundle.
      { label: 'Duty Roulette', icon: 'shuffle', path: '/roulette', query: { types: '1,3,6' } },
      { label: 'Market History', icon: 'chart', path: '/market-history' },
    ],
  },
];

// A page's link is current on the page and below it (a listing's own page),
// whatever its query string picks.
export const PAGE_MATCH: IsActiveMatchOptions = {
  paths: 'subset',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'ignored',
};
