import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { API_URL } from '@everise/core/http-client';
import { TURNSTILE_SITE_KEY } from '@everise/ui/components';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  // No bot check here: the site has no Turnstile key.
  async function render(query: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
        { provide: TURNSTILE_SITE_KEY, useValue: '' },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      ],
    });
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const type = async (id: string, value: string) => {
      const input = page.querySelector(`#${id}`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return {
      fixture,
      page,
      type,
      http: TestBed.inject(HttpTestingController),
      button: () => page.querySelector('[data-testid=reset-password]') as HTMLButtonElement,
    };
  }

  it("fills in the email link's code, takes the new password twice and sends only the code and the password", async () => {
    const { fixture, page, type, http, button } = await render({ code: 'ABCD-EFGH' });
    expect((page.querySelector('#code') as HTMLInputElement).value).toBe('ABCD-EFGH');
    const authStore = TestBed.inject(AuthStore);
    patchState(unprotected(authStore), { loggedIn: true });

    await type('password', 'new-crystal-1');
    await type('repeat', 'new-crystal-2');
    expect(page.textContent).toContain("The two passwords don't match.");
    expect(button().disabled).toBe(true);

    await type('repeat', 'new-crystal-1');
    button().click();
    const request = http.expectOne('/api/users/password-reset/confirm');
    expect(JSON.parse(request.request.body)).toEqual({ code: 'ABCD-EFGH', password: 'new-crystal-1' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(page.querySelector('form')).toBeNull();
    const done = page.querySelector('cdt-message.done') as HTMLElement;
    expect(done.textContent).toContain('Your password is changed');
    expect(done.querySelector('a')?.getAttribute('href')).toBe('/login');
    // Every device was signed out, this one too.
    expect(authStore.loggedIn()).toBe(false);
  });

  it("keeps the form and shows the server's message for a wrong code", async () => {
    const { fixture, page, type, http, button } = await render();
    await type('code', 'AAAA-AAAA');
    await type('password', 'new-crystal-1');
    await type('repeat', 'new-crystal-1');

    button().click();
    http
      .expectOne('/api/users/password-reset/confirm')
      .flush(
        { errors: { body: ['That code is wrong or has expired. Check it, or ask for a new one.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await fixture.whenStable();

    expect(page.textContent).toContain('That code is wrong or has expired.');
    expect(page.querySelector('form')).not.toBeNull();
  });

  it('takes 8 to 72 characters', async () => {
    const { page, type } = await render({ code: 'ABCD-EFGH' });

    await type('password', 'short');
    expect(page.textContent).toContain('Use at least 8 characters.');
    await type('password', 'x'.repeat(73));
    expect(page.textContent).toContain('Use at most 72 characters.');
  });
});
