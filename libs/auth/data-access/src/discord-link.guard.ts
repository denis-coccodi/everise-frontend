import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { map, skipWhile, take } from 'rxjs';
import { AuthStore } from './auth.store';
import { rememberReturnUrl } from './return-url';

// Links the site shares in the Everise Discord carry ?from=discord. Anyone
// in the channel can see them, and not all of them are members, so whoever
// opens one signed out is asked to sign in first, then brought back. The
// same pages opened any other way stay open to everyone.
export const discordLinkGuard: CanActivateFn = (route, state) => {
  if (route.queryParamMap.get('from') !== 'discord') return true;
  const authStore = inject(AuthStore);
  const router = inject(Router);
  return toObservable(authStore.getUserLoading).pipe(
    // The session check on startup must answer first.
    skipWhile((loading) => loading),
    take(1),
    map(() => {
      if (authStore.loggedIn()) return true;
      rememberReturnUrl(state.url);
      return router.createUrlTree(['/login'], { queryParams: { from: 'discord' } });
    }),
  );
};
