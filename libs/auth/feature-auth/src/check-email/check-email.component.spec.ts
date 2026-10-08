import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@everise/core/http-client';
import { TURNSTILE_SITE_KEY, TurnstileApi } from '@everise/ui/components';
import { CheckEmailComponent } from './check-email.component';

describe('CheckEmailComponent', () => {
  async function render(siteKey = '') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
        { provide: TURNSTILE_SITE_KEY, useValue: siteKey },
      ],
    });
    const fixture = TestBed.createComponent(CheckEmailComponent);
    fixture.componentRef.setInput('email', 'alisaie@example.com');
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      page,
      http: TestBed.inject(HttpTestingController),
      button: page.querySelector('button[cdtButton]') as HTMLButtonElement,
      status: () => page.querySelector('[role=status]')?.textContent?.trim(),
    };
  }

  it('says where the link went, in a named region', async () => {
    const { page } = await render();

    expect(page.querySelector('[role=region]')?.getAttribute('aria-label')).toBe('Check your email');
    expect(page.textContent).toContain('We sent a link to alisaie@example.com.');
  });

  it('sends the link again, and announces it', async () => {
    const { fixture, http, button, status } = await render();

    button.click();
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
    const request = http.expectOne('/api/users/confirm-email/resend');
    expect(JSON.parse(request.request.body)).toEqual({ user: { email: 'alisaie@example.com' } });
    request.flush({ confirmation: { email: 'alisaie@example.com' } }, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();

    expect(status()).toBe('Sent again to alisaie@example.com.');
    expect(button.disabled).toBe(false);
  });

  it('with a bot check, waits for its pass and sends it along', async () => {
    let options: Parameters<TurnstileApi['render']>[1] | undefined;
    (window as Window & { turnstile?: TurnstileApi }).turnstile = {
      render: (_container, given) => {
        options = given;
        return 'widget-1';
      },
      reset: () => undefined,
      remove: () => undefined,
    };
    const { fixture, http, button } = await render('site-key');
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    expect(options?.action).toBe('resend');
    expect(button.disabled).toBe(true);

    options?.callback('pass-1');
    await fixture.whenStable();
    button.click();

    expect(JSON.parse(http.expectOne('/api/users/confirm-email/resend').request.body)).toEqual({
      user: { email: 'alisaie@example.com' },
      turnstileToken: 'pass-1',
    });
    delete (window as Window & { turnstile?: TurnstileApi }).turnstile;
  });

  it("passes on the backend's reason when it's too soon", async () => {
    const { fixture, http, button, status } = await render();

    button.click();
    http
      .expectOne('/api/users/confirm-email/resend')
      .flush(
        { errors: { body: ["We've just sent a link. Try again in 42 seconds."] } },
        { status: 429, statusText: 'Too Many Requests' },
      );
    await fixture.whenStable();

    expect(status()).toBe("We've just sent a link. Try again in 42 seconds.");
  });
});
