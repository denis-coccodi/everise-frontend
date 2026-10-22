import { Routes } from '@angular/router';
import { WakingSandsComponent } from './lib/waking-sands/waking-sands.component';

export const WAKING_SANDS_ROUTES: Routes = [
  {
    path: '',
    title: 'The Waking Sands',
    // Open to everyone to look around; talking needs an account, which the
    // page checks itself.
    component: WakingSandsComponent,
  },
];
