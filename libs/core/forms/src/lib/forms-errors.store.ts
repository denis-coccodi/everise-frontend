import { computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

// The API's errors: {"body": ["…"]} for messages written for the reader, or
// a field name with its problems, e.g. {"email": ["is invalid"]}.
export interface Errors {
  [key: string]: string | string[];
}

// What to say when the server sent no message of its own.
export const UNREACHABLE_MESSAGE = "Can't reach the server. Check your connection and try again.";
export const FAILURE_MESSAGE = 'Something went wrong on our side. Please try again in a moment.';

export const FormErrorsStore = signalStore(
  { providedIn: 'root' },
  withState<{ _errors: Errors }>({
    _errors: {},
  }),
  withComputed(({ _errors }) => ({
    // "body" messages are full sentences, shown as they are; field errors
    // are prefixed with the field's name.
    errors: computed(() =>
      Object.entries(_errors() ?? {}).flatMap(([key, value]) =>
        (Array.isArray(value) ? value : [value]).map((message) => (key === 'body' ? message : `${key} ${message}`)),
      ),
    ),
  })),
  withMethods((store) => ({
    setErrors(errors: Errors): void {
      patchState(store, { _errors: errors });
    },
    // Shows a failed request's errors, or a general message when it has none
    // (the server couldn't be reached, or failed without saying why).
    setResponseErrors(response: HttpErrorResponse): void {
      const errors = response.error?.errors;
      const fallback = response.status === 0 ? UNREACHABLE_MESSAGE : FAILURE_MESSAGE;
      patchState(store, {
        _errors: errors && typeof errors === 'object' && Object.keys(errors).length > 0 ? errors : { body: [fallback] },
      });
    },
  })),
);
