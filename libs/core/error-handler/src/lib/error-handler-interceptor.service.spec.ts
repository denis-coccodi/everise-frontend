import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerStore } from './error-handler.store';
import { SKIP_LOGIN_REDIRECT, errorHandlingInterceptor } from './error-handler-interceptor.service';

describe('errorHandlingInterceptor', () => {
  const handleError401 = vi.fn();
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    handleError401.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorHandlingInterceptor])),
        provideHttpClientTesting(),
        { provide: ErrorHandlerStore, useValue: { handleError401, handleError404: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  function failWith401(context?: HttpContext) {
    http.get('/api/articles/feed', { context }).subscribe({ error: () => undefined });
    backend.expectOne('/api/articles/feed').flush(null, { status: 401, statusText: 'Unauthorized' });
  }

  it('sends a 401 to the login redirect', () => {
    failWith401();
    expect(handleError401).toHaveBeenCalledOnce();
  });

  it("doesn't redirect a request that only checks whether someone is logged in", () => {
    failWith401(new HttpContext().set(SKIP_LOGIN_REDIRECT, true));
    expect(handleError401).not.toHaveBeenCalled();
  });
});
