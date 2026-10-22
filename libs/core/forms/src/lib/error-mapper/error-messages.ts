import { InjectionToken } from '@angular/core';
import { ValidationError } from '@angular/forms/signals';

// A signal forms validator's error, by its kind; each message reads what it
// needs from it.
export type ErrorMessage = (error: ValidationError) => string;

export const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  required: () => `Fill in this field.`,
  email: () => `Enter a valid email address, like name@example.com.`,
  minLength: (error) => `Use at least ${requiredLength(error)} characters.`,
  maxLength: (error) => `Use at most ${'maxLength' in error ? Number(error.maxLength) : 0} characters.`,
  sameAs: () => `The two passwords don't match.`,
  sameEmail: () => `That's already your email address.`,
  min: (error) => `Use ${'min' in error ? Number(error.min) : 0} or more.`,
  max: (error) => `Use ${'max' in error ? Number(error.max) : 0} or less.`,
};

// The minLength validator's error: { kind: 'minLength', minLength }.
function requiredLength(error: ValidationError) {
  return 'minLength' in error ? Number(error.minLength) : 0;
}

export const VALIDATION_ERROR_MESSAGES = new InjectionToken(`Validation Messages`, {
  providedIn: 'root',
  factory: () => ERROR_MESSAGES,
});
