import { InjectionToken } from '@angular/core';

export const ERROR_MESSAGES: { [key in string]: (args?: any) => string } = {
  required: () => `Fill in this field.`,
  email: () => `Enter a valid email address, like name@example.com.`,
  minlength: ({ requiredLength }) => `Use at least ${requiredLength} characters.`,
};

export const VALIDATION_ERROR_MESSAGES = new InjectionToken(`Validation Messages`, {
  providedIn: 'root',
  factory: () => ERROR_MESSAGES,
});
