import type { ValidationError } from '@angular/forms/signals';

// A signal forms validator's error, by its kind; each message reads what it
// needs from it.
export type ErrorMessage = (error: ValidationError) => string;
