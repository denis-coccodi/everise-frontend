import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { ApplicationConfig, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { AuthGuard, discordLinkGuard } from '@everise/auth/data-access';
import { errorHandlingInterceptor } from '@everise/core/error-handler';
import { API_URL } from '@everise/core/http-client';
import { TURNSTILE_SITE_KEY } from '@everise/ui/components';
import { environment } from '../environments/environment';
import { watchAppUpdates } from './app-updates';
import { PageTitleStrategy } from './page-title.strategy';

const capitalised = (name: string) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAppInitializer(() => {
      caches.open('everise-sw-config').then((cache) =>
        cache.put(
          '/sw-config.json',
          new Response(JSON.stringify({ api_url: environment.api_url }), {
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );
    }),
    provideRouter(
      [
        {
          path: '',
          redirectTo: 'home',
          pathMatch: 'full',
        },
        {
          path: 'home',
          title: 'Home',
          // Open to everyone: guests see the global feed, where roulette
          // results are posted; "Your Feed" needs an account.
          loadComponent: () => import('@everise/home/feature-home').then((m) => m.HomeComponent),
        },
        {
          path: 'login',
          title: 'Sign in',
          loadComponent: () => import('@everise/auth/feature-auth').then((m) => m.LoginComponent),
        },
        {
          path: 'register',
          title: 'Sign up',
          loadComponent: () => import('@everise/auth/feature-auth').then((m) => m.RegisterComponent),
        },
        {
          // The link in a confirmation email.
          path: 'confirm-email',
          title: 'Confirm your email',
          loadComponent: () => import('@everise/auth/feature-auth').then((m) => m.ConfirmEmailComponent),
        },
        {
          path: 'privacy',
          title: 'Privacy policy',
          loadComponent: () => import('@everise/auth/feature-auth').then((m) => m.PrivacyComponent),
        },
        {
          path: 'article',
          title: 'Article',
          // A post linked from the Everise Discord asks for sign-in first.
          canActivate: [discordLinkGuard],
          loadChildren: () => import('@everise/articles/article').then((m) => m.ARTICLE_ROUTES),
        },
        {
          path: 'roulette',
          title: 'Duty Roulette',
          loadComponent: () => import('@everise/roulette/feature-roulette').then((m) => m.RouletteComponent),
          // Open to everyone. Features that need an account (saving or sharing
          // a result) check the login themselves.
        },
        {
          path: 'waking-sands',
          title: 'The Waking Sands',
          // Open to everyone to look around; talking needs an account, which
          // the page checks itself.
          loadComponent: () => import('@everise/waking-sands/feature-waking-sands').then((m) => m.WakingSandsComponent),
        },
        {
          path: 'party-finder',
          title: 'Party Finder',
          canActivate: [discordLinkGuard],
          // Open to everyone: the listings are public in the game and on xivpf.
          loadComponent: () => import('@everise/party-finder/feature-party-finder').then((m) => m.PartyFinderComponent),
        },
        {
          // A data centre's own page (/party-finder/light), which search
          // engines list and links share.
          path: 'party-finder/:dataCentre',
          canActivate: [discordLinkGuard],
          title: (route) => `${capitalised(route.paramMap.get('dataCentre') ?? '')} Party Finder`,
          loadComponent: () => import('@everise/party-finder/feature-party-finder').then((m) => m.PartyFinderComponent),
        },
        {
          path: 'settings',
          title: 'Settings',
          loadComponent: () =>
            import('@everise/settings/feature-settings').then((settings) => settings.SettingsComponent),
          canActivate: [AuthGuard],
        },
        {
          path: 'editor',
          loadChildren: () => import('@everise/articles/article-edit').then((article) => article.ARTICLE_EDIT_ROUTES),
          canActivate: [AuthGuard],
        },
        {
          path: 'profile',
          canActivate: [AuthGuard],
          loadChildren: () => import('@everise/profile/feature-profile').then((profile) => profile.PROFILE_ROUTES),
        },
        {
          path: '**',
          redirectTo: 'home',
        },
      ],
      withViewTransitions(),
      withComponentInputBinding(),
    ),
    provideHttpClient(withXhr(), withInterceptors([errorHandlingInterceptor])),
    { provide: API_URL, useValue: environment.api_url },
    { provide: TURNSTILE_SITE_KEY, useValue: environment.turnstileSiteKey },
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    // provideServiceWorker('ngsw-worker.js', {
    //   enabled: !isDevMode(),
    //   registrationStrategy: 'registerWhenStable:30000',
    // }),
    // A new version of the site replaces the cached one (app-updates.ts).
    provideAppInitializer(watchAppUpdates),
    provideServiceWorker('offline-sw.js', {
      enabled: environment.serviceWorker,
      registrationStrategy: 'registerWhenStable:30000',
      // registrationStrategy: 'registerImmediately',
    }),
  ],
};
