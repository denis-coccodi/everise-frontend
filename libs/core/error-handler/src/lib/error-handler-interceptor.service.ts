import { HttpContextToken, HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorHandlerStore } from './error-handler.store';

// Set on a request whose 401 only means "not logged in", such as the session
// check on startup, so it doesn't send the visitor to the login page. Pages
// that need an account have the AuthGuard for that.
export const SKIP_LOGIN_REDIRECT = new HttpContextToken<boolean>(() => false);

// Set on a request whose 404 is the page's to explain, such as sharing a
// Party Finder listing that has just ended, so it doesn't send the visitor
// to the home page (and close what they were doing).
export const SKIP_NOT_FOUND_REDIRECT = new HttpContextToken<boolean>(() => false);

export const errorHandlingInterceptor = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const errorHandlerStore = inject(ErrorHandlerStore);

  return next(request).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 401:
            if (!request.context.get(SKIP_LOGIN_REDIRECT)) errorHandlerStore.handleError401(error);
            break;
          case 404:
            if (!request.context.get(SKIP_NOT_FOUND_REDIRECT)) errorHandlerStore.handleError404(error);
            break;
          default:
            throwError(error);
            break;
        }
      }
      return throwError(error);
    }),
  );
};
