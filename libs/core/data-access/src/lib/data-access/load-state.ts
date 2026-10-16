import { Resource } from '@angular/core';
import { serverMessage } from '@everise/core/forms';

// What a page shows for a load kept in a resource.
export type LoadState = 'loading' | 'ready' | 'error';

// 'loading' until the first answer, 'error' when the load failed with
// nothing to show, else 'ready': a refresh keeps it, and so does a failed
// one when the resource keeps its last value (withPreviousValueOnError).
export function loadStateOf(resource: Resource<unknown>): LoadState {
  if (resource.hasValue()) return 'ready';
  return resource.status() === 'error' ? 'error' : 'loading';
}

// Why the resource's last load failed, in the backend's words; '' while it
// hasn't.
export function errorMessageOf(resource: Resource<unknown>): string {
  const error = resource.error();
  return error ? serverMessage(error) : '';
}
