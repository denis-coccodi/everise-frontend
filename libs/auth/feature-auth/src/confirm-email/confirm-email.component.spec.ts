import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@realworld/auth/data-access';
import { API_URL } from '@realworld/core/http-client';
import { ConfirmEmailComponent } from './confirm-email.component';

describe('ConfirmEmailComponent', () => {
  async function render(token?: string) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    const fixture = TestBed.createComponent(ConfirmEmailComponent);
    if (token !== undefined) fixture.componentRef.setInput('token', token);
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement, http: TestBed.inject(HttpTestingController) };
  }

  it('confirms the email from the link and signs in', async () => {
    const { fixture, page, http } = await render('the-token');
    expect(page.querySelector('[role=status]')?.textContent).toContain('Confirming');

    const request = http.expectOne('/api/users/confirm-email');
    expect(JSON.parse(request.request.body)).toEqual({ token: 'the-token' });
    request.flush({ user: { id: 'u1', username: 'Alisaie', email: 'a@example.com', bio: '', image: '' } });
    await fixture.whenStable();

    expect(page.querySelector('[role=status]')?.textContent).toContain('Welcome to Everise, Alisaie!');
    expect(page.querySelector('a[href="/home"]')).not.toBeNull();
    const store = TestBed.inject(AuthStore);
    expect(store.loggedIn()).toBe(true);
    expect(store.user().username).toBe('Alisaie');
  });

  it("says why a link doesn't work, and offers to sign in", async () => {
    const { fixture, page, http } = await render('old-token');

    http
      .expectOne('/api/users/confirm-email')
      .flush(
        { errors: { body: ['This link has expired or was already used. Sign in to get a new one.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await fixture.whenStable();

    expect(page.querySelector('[role=status]')?.textContent).toContain('This link has expired or was already used.');
    expect(page.querySelector('a[href="/login"]')).not.toBeNull();
    expect(TestBed.inject(AuthStore).loggedIn()).toBe(false);
  });

  it('explains a link without its token', async () => {
    const { page, http } = await render();

    expect(page.querySelector('[role=status]')?.textContent).toContain('This link is incomplete.');
    http.expectNone('/api/users/confirm-email');
  });
});
