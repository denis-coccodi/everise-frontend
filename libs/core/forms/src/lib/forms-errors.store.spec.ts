import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FAILURE_MESSAGE, FormErrorsStore, UNREACHABLE_MESSAGE } from './forms-errors.store';

describe('FormErrorsStore', () => {
  let store: InstanceType<typeof FormErrorsStore>;

  beforeEach(() => {
    store = TestBed.inject(FormErrorsStore);
  });

  it('shows the API\'s "body" messages as they are, without the key', () => {
    store.setErrors({ body: ['Wrong email or password.', 'Choose a username.'] });

    expect(store.errors()).toEqual(['Wrong email or password.', 'Choose a username.']);
  });

  it('prefixes field errors with the field', () => {
    store.setErrors({ email: ['is invalid'], title: "can't be blank" });

    expect(store.errors()).toEqual(['email is invalid', "title can't be blank"]);
  });

  it("shows a failed request's own messages", () => {
    store.setResponseErrors(
      new HttpErrorResponse({ status: 401, error: { errors: { body: ['Wrong email or password.'] } } }),
    );

    expect(store.errors()).toEqual(['Wrong email or password.']);
  });

  it('explains a request that never reached the server, or failed without a message', () => {
    store.setResponseErrors(new HttpErrorResponse({ status: 0 }));
    expect(store.errors()).toEqual([UNREACHABLE_MESSAGE]);

    store.setResponseErrors(new HttpErrorResponse({ status: 502, error: 'Bad Gateway' }));
    expect(store.errors()).toEqual([FAILURE_MESSAGE]);
  });
});
