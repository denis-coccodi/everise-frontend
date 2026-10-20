import { Resource } from '@angular/core';
import { serverMessage } from '@everise/core/forms';

// Why the resource's last load failed, in the backend's words; '' while it
// hasn't. Pages read the rest (hasValue, isLoading, error) from the resource.
export function errorMessageOf(resource: Resource<unknown>): string {
  const error = resource.error();
  return error ? serverMessage(error) : '';
}
