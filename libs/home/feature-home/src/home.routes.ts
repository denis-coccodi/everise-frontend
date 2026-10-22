import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    title: 'Home',
    // Open to everyone: guests see the global feed, where roulette results
    // are posted; "Your Feed" needs an account.
    component: HomeComponent,
  },
];
