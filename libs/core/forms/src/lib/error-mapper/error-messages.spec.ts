import { ValidationError } from '@angular/forms/signals';
import { ERROR_MESSAGES } from './error-messages';

describe('ERROR_MESSAGES', () => {
  const message = (error: Record<string, unknown>) =>
    ERROR_MESSAGES[String(error['kind'])](error as unknown as ValidationError);

  it('says how many characters a field needs', () => {
    expect(message({ kind: 'minLength', minLength: 8 })).toBe('Use at least 8 characters.');
    expect(message({ kind: 'maxLength', maxLength: 280 })).toBe('Use at most 280 characters.');
  });

  it("gives a number field's limits", () => {
    expect(message({ kind: 'min', min: 0 })).toBe('Use 0 or more.');
    expect(message({ kind: 'max', max: 50 })).toBe('Use 50 or less.');
  });
});
