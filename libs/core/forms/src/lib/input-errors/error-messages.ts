import { InjectionToken } from '@angular/core';

// A validator's error value is whatever the validator put there; each
// message reads what it needs from it.
export type ErrorMessage = (error: unknown) => string;

export const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  required: () => `Fill in this field.`,
  email: () => `Enter a valid email address, like name@example.com.`,
  minlength: (error) => `Use at least ${requiredLength(error)} characters.`,
};

// Angular's minlength error: { requiredLength, actualLength }.
function requiredLength(error: unknown) {
  return typeof error === 'object' && error !== null && 'requiredLength' in error ? Number(error.requiredLength) : 0;
}

export const VALIDATION_ERROR_MESSAGES = new InjectionToken(`Validation Messages`, {
  providedIn: 'root',
  factory: () => ERROR_MESSAGES,
});
