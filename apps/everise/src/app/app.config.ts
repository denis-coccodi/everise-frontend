import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withNavigationErrorHandler,
  withViewTransitions,
} from '@angular/router';
import { sessionCheckInterceptor } from '@everise/auth/data-access';
import { errorHandlingInterceptor } from '@everise/core/error-handler';
import { API_URL } from '@everise/core/http-client';
import { TURNSTILE_SITE_KEY } from '@everise/ui/components';
import { environment } from '../environments/environment';
import { APP_ROUTES } from './app.routes';
import { reloadOnFailedPageLoad } from './failed-page-load';
import { PageTitleStrategy } from './page-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      APP_ROUTES,
      withViewTransitions(),
      withComponentInputBinding(),
      withNavigationErrorHandler((event) => reloadOnFailedPageLoad(event)),
    ),
    provideHttpClient(withXhr(), withInterceptors([errorHandlingInterceptor, sessionCheckInterceptor])),
    { provide: API_URL, useValue: environment.api_url },
    { provide: TURNSTILE_SITE_KEY, useValue: environment.turnstileSiteKey },
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ],
};
