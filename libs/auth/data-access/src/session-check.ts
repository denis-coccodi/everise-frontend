import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { DOCUMENT, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthStore } from './auth.store';

// How long a tab can be away before coming back to it asks the server again.
export const RECHECK_AFTER_MS = 60_000;

// While the page thinks someone is signed in, a 401 (not signed in) or a
// 429 (a guest's limit, such as the planner's 10 new pulls an hour) means
// the server no longer does: the session expired or was signed out
// elsewhere. The page checks, so it shows them signed out too.
export function sessionCheckInterceptor(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const authStore = inject(AuthStore);
  return next(request).pipe(
    catchError((error: unknown) => {
      const stale = error instanceof HttpErrorResponse && (error.status === 401 || error.status === 429);
      if (stale && authStore.loggedIn() && !(request.method === 'GET' && request.url.endsWith('/user')))
        authStore.checkSession();
      return throwError(() => error);
    }),
  );
}

// Back to a tab after a while (another tab, the browser reopened with the
// page still open), the session it showed may have ended meanwhile.
export function checkSessionOnReturn(authStore: InstanceType<typeof AuthStore>, now = () => Date.now()) {
  const document = inject(DOCUMENT);
  let hidden = now();
  const onChange = () => {
    if (document.visibilityState === 'hidden') hidden = now();
    else if (authStore.loggedIn() && now() - hidden >= RECHECK_AFTER_MS) authStore.checkSession();
  };
  // Restored from the back/forward cache: no new page load checked it.
  const onShow = (event: PageTransitionEvent) => {
    if (event.persisted && authStore.loggedIn()) authStore.checkSession();
  };
  document.addEventListener('visibilitychange', onChange);
  document.defaultView?.addEventListener('pageshow', onShow);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
    document.defaultView?.removeEventListener('pageshow', onShow);
  };
}
