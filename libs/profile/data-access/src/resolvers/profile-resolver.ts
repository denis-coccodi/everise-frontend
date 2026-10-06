import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { of } from 'rxjs';
import { ProfileStore } from '../profile.store';

export const profileResolver: ResolveFn<boolean> = (route: ActivatedRouteSnapshot) => {
  const id = route.params['id'];
  const profileStore = inject(ProfileStore);

  profileStore.getProfile(id);

  return of(true);
};
