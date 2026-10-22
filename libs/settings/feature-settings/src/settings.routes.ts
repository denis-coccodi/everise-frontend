import { Routes } from '@angular/router';
import { SettingsComponent } from './settings/settings.component';

// Members only: the app checks the sign-in before loading this library.
export const SETTINGS_ROUTES: Routes = [{ path: '', title: 'Settings', component: SettingsComponent }];
