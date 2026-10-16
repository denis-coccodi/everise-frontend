import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '@everise/core/http-client';
import { TURNSTILE_SITE_KEY, TurnstileApi } from '@everise/ui/components';
import { ForgotPasswordComponent } from './forgot-password.component';

type Options = Parameters<TurnstileApi['render']>[1];

describe('ForgotPasswordComponent', () => {
  // Turnstile's script, already on the page: keeps the widgets' options.
  let widgets: Options[];
  beforeEach(() => {
    widgets = [];
    (window as Window & { turnstile?: TurnstileApi }).turnstile = {
      render: (_container, options) => String(widgets.push(options)),
      reset: () => undefined,
      remove: () => undefined,
    };
  });
  afterEach(() => {
    delete (window as Window & { turnstile?: TurnstileApi }).turnstile;
  });

  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
        { provide: TURNSTILE_SITE_KEY, useValue: 'site-key' },
      ],
    });
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    const page = fixture.nativeElement as HTMLElement;
    const input = page.querySelector('#email') as HTMLInputElement;
    input.value = 'yshtola@example.com';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    return {
      fixture,
      page,
      http: TestBed.inject(HttpTestingController),
      button: page.querySelector('[data-testid=send-code]') as HTMLButtonElement,
    };
  }

  it('sends the address with the bot check, then says a code may be on its way and where to enter it', async () => {
    const { fixture, page, http, button } = await render();
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Forgot your password?');
    expect(widgets.map((w) => w.action)).toEqual(['forgot-password']);
    expect(button.disabled).toBe(true);

    widgets[0].callback('pass-1');
    await fixture.whenStable();
    button.click();
    const request = http.expectOne('/api/users/password-reset');
    expect(JSON.parse(request.request.body)).toEqual({
      user: { email: 'yshtola@example.com' },
      turnstileToken: 'pass-1',
    });
    request.flush({ passwordReset: { email: 'yshtola@example.com' } });
    await fixture.whenStable();

    const sent = page.querySelector('cdt-message.sent') as HTMLElement;
    expect(sent.getAttribute('role')).toBe('status');
    expect(sent.textContent).toContain('If yshtola@example.com has an Everise account, a code is on its way.');
    expect(sent.querySelector('a')?.getAttribute('href')).toBe('/reset-password');
  });

  it("shows the server's message when it refuses", async () => {
    const { fixture, page, http, button } = await render();
    widgets[0].callback('pass-1');
    await fixture.whenStable();

    button.click();
    http
      .expectOne('/api/users/password-reset')
      .flush(
        { errors: { body: ["We've just sent a code. Try again in 42 seconds."] } },
        { status: 429, statusText: 'Too Many Requests' },
      );
    await fixture.whenStable();

    expect(page.textContent).toContain("We've just sent a code. Try again in 42 seconds.");
    expect(page.querySelector('cdt-message.sent')?.textContent?.trim()).toBe('');
  });
});
