import type { Params } from '@angular/router';
import type { IconName } from '@everise/ui/components';
import type { environment } from '../../../environments/environment';

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

// The features switched on in this build (environments/).
export type Features = typeof environment.features;
