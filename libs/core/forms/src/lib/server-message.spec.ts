import { HttpErrorResponse } from '@angular/common/http';
import { FAILURE_MESSAGE, UNREACHABLE_MESSAGE } from './forms-errors.store';
import { serverMessage } from './server-message';

describe('serverMessage', () => {
  it("is the backend's own message", () => {
    const error = new HttpErrorResponse({
      status: 429,
      error: { errors: { body: ['You can upload 30 images a day.'] } },
    });

    expect(serverMessage(error)).toBe('You can upload 30 images a day.');
  });

  it('says the server is unreachable when no answer came', () => {
    expect(serverMessage(new HttpErrorResponse({ status: 0 }))).toBe(UNREACHABLE_MESSAGE);
  });

  it.each([
    ['an answer without a message', new HttpErrorResponse({ status: 500, error: 'Internal Server Error' })],
    ['field errors only', new HttpErrorResponse({ status: 422, error: { errors: { email: ['is invalid'] } } })],
    ['anything that is not a response', new Error('boom')],
  ])('falls back to a general message for %s', (_case, error) => {
    expect(serverMessage(error)).toBe(FAILURE_MESSAGE);
  });
});
