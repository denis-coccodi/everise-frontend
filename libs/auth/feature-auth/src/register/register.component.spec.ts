import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '@everise/core/http-client';
import { TURNSTILE_SITE_KEY, TurnstileApi } from '@everise/ui/components';
import { RegisterComponent } from './register.component';

type Options = Parameters<TurnstileApi['render']>[1];

describe('RegisterComponent', () => {
  // Turnstile's script, already on the page: keeps the widgets' options.
  let widgets: Options[];
  let resets: number;
  beforeEach(() => {
    widgets = [];
    resets = 0;
    (window as Window & { turnstile?: TurnstileApi }).turnstile = {
      render: (_container, options) => String(widgets.push(options)),
      reset: () => resets++,
      remove: () => undefined,
    };
  });
  afterEach(() => {
    delete (window as Window & { turnstile?: TurnstileApi }).turnstile;
  });

  async function render(siteKey = 'site-key') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
        { provide: TURNSTILE_SITE_KEY, useValue: siteKey },
      ],
    });
    const fixture = TestBed.createComponent(RegisterComponent);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    const page = fixture.nativeElement as HTMLElement;
    const type = (id: string, value: string) => {
      const input = page.querySelector(`#${id}`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('username', 'alisaie');
    type('email', 'alisaie@example.com');
    type('password', 'echo-of-light');
    await fixture.whenStable();
    return {
      fixture,
      http: TestBed.inject(HttpTestingController),
      button: page.querySelector('[data-testid=sign-up]') as HTMLButtonElement,
    };
  }

  it('waits for the bot check, then sends its pass with the sign-up and asks for a new one', async () => {
    const { fixture, http, button } = await render();
    expect(widgets.map((w) => w.action)).toEqual(['signup']);
    expect(button.disabled).toBe(true);

    widgets[0].callback('pass-1');
    await fixture.whenStable();
    expect(button.disabled).toBe(false);

    button.click();
    const request = http.expectOne('/api/users');
    expect(JSON.parse(request.request.body)).toEqual({
      user: { username: 'alisaie', email: 'alisaie@example.com', password: 'echo-of-light' },
      turnstileToken: 'pass-1',
    });
    expect(resets).toBe(1);
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
  });

  it('signs up without waiting when the site has no bot check', async () => {
    const { http, button } = await render('');
    expect(button.disabled).toBe(false);

    button.click();

    expect(JSON.parse(http.expectOne('/api/users').request.body)).toEqual({
      user: { username: 'alisaie', email: 'alisaie@example.com', password: 'echo-of-light' },
    });
  });
});
