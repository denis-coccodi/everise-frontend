import { DOCUMENT, inject } from '@angular/core';

// The address a reset code was asked for, carried between "Forgot your
// password?" and the page for entering the code in the browser's navigation
// state rather than the URL, so it stays out of the history and the logs.
// Gone after a reload, or when the page is opened from the email's link.

// For router.navigate(…, { state }) and [state] on a routerLink.
export function resetEmailState(email: string) {
  return { resetEmail: email };
}

// The address the current page was given, if any. In an injection context.
export function resetEmail(): string | null {
  const state: unknown = inject(DOCUMENT).defaultView?.history.state;
  return state && typeof state === 'object' && 'resetEmail' in state && typeof state.resetEmail === 'string'
    ? state.resetEmail
    : null;
}
