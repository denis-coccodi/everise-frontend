import { HttpErrorResponse } from '@angular/common/http';
import { FAILURE_MESSAGE, UNREACHABLE_MESSAGE } from './forms-errors.store';

// What to tell the person about a failed request: the backend's own words
// (its errors are {"errors": {"body": ["…"]}}, written for the reader: a
// daily limit, a refused picture), or a general message when it gave none:
// the server couldn't be reached, or failed without saying why.
export function serverMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return UNREACHABLE_MESSAGE;
    const message = bodyMessage(error.error);
    if (message) return message;
  }
  return FAILURE_MESSAGE;
}

function bodyMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('errors' in body)) return undefined;
  const errors = body.errors;
  if (typeof errors !== 'object' || errors === null || !('body' in errors)) return undefined;
  const messages = errors.body;
  return Array.isArray(messages) && typeof messages[0] === 'string' ? messages[0] : undefined;
}
