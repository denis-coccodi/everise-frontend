import { Routes } from '@angular/router';
import { RouletteComponent } from './lib/roulette/roulette.component';

export const ROULETTE_ROUTES: Routes = [
  {
    path: '',
    title: 'Duty Roulette',
    // Open to everyone. Features that need an account (saving or sharing a
    // result) check the login themselves.
    component: RouletteComponent,
  },
];
