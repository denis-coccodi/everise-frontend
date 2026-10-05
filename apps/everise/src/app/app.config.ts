import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { ApplicationConfig, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { AuthGuard } from '@realworld/auth/data-access';
import { errorHandlingInterceptor } from '@realworld/core/error-handler';
import { API_URL } from '@realworld/core/http-client';
import { environment } from '../environments/environment';

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
          // Open to everyone: guests see the global feed, where roulette
          // results are posted; "Your Feed" needs an account.
          loadComponent: () => import('@realworld/home/feature-home').then((m) => m.HomeComponent),
        },
        {
          path: 'login',
          loadComponent: () => import('@realworld/auth/feature-auth').then((m) => m.LoginComponent),
        },
        {
          path: 'register',
          loadComponent: () => import('@realworld/auth/feature-auth').then((m) => m.RegisterComponent),
        },
        {
          path: 'article',
          loadChildren: () => import('@realworld/articles/article').then((m) => m.ARTICLE_ROUTES),
        },
        {
          path: 'roulette',
          title: 'Duty Roulette · Everise',
          loadComponent: () => import('@realworld/roulette/feature-roulette').then((m) => m.RouletteComponent),
          // Open to everyone. Features that need an account (saving or sharing
          // a result) check the login themselves.
        },
        {
          path: 'settings',
          loadComponent: () =>
            import('@realworld/settings/feature-settings').then((settings) => settings.SettingsComponent),
          canActivate: [AuthGuard],
        },
        {
          path: 'editor',
          loadChildren: () => import('@realworld/articles/article-edit').then((article) => article.ARTICLE_EDIT_ROUTES),
          canActivate: [AuthGuard],
        },
        {
          path: 'profile',
          canActivate: [AuthGuard],
          loadChildren: () => import('@realworld/profile/feature-profile').then((profile) => profile.PROFILE_ROUTES),
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
    // provideServiceWorker('ngsw-worker.js', {
    //   enabled: !isDevMode(),
    //   registrationStrategy: 'registerWhenStable:30000',
    // }),
    provideServiceWorker('offline-sw.js', {
      enabled: environment.serviceWorker,
      registrationStrategy: 'registerWhenStable:30000',
      // registrationStrategy: 'registerImmediately',
    }),
  ],
};
