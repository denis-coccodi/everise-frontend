import { inject, Pipe, PipeTransform } from '@angular/core';
import { ValidationError } from '@angular/forms/signals';
import { VALIDATION_ERROR_MESSAGES } from './error-messages';

@Pipe({
  name: 'errorMapper',
})
export class ErrorMapperPipe implements PipeTransform {
  private errorMessages = inject(VALIDATION_ERROR_MESSAGES);

  // Our words for a validator's error, else the message it came with.
  transform(error: ValidationError): string {
    return this.errorMessages[error.kind]?.(error) ?? error.message ?? '';
  }
}
