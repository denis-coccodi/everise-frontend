import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL } from '@everise/core/http-client';
import { TURNSTILE_SITE_KEY, TurnstileApi } from '@everise/ui/components';
import { LoginComponent } from './login.component';

type Options = Parameters<TurnstileApi['render']>[1];

describe('LoginComponent', () => {
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
    const fixture = TestBed.createComponent(LoginComponent);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    const page = fixture.nativeElement as HTMLElement;
    const type = (id: string, value: string) => {
      const input = page.querySelector(`#${id}`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('email', 'alisaie@example.com');
    type('password', 'echo-of-light');
    await fixture.whenStable();
    return {
      fixture,
      http: TestBed.inject(HttpTestingController),
      button: page.querySelector('[data-testid=sign-in]') as HTMLButtonElement,
    };
  }

  it('waits for the bot check, then sends its pass with the sign-in and asks for a new one', async () => {
    const { fixture, http, button } = await render();
    expect(widgets.map((w) => w.action)).toEqual(['login']);
    expect(button.disabled).toBe(true);

    widgets[0].callback('pass-1');
    await fixture.whenStable();
    expect(button.disabled).toBe(false);

    button.click();
    const request = http.expectOne('/api/users/login');
    expect(JSON.parse(request.request.body)).toEqual({
      user: { email: 'alisaie@example.com', password: 'echo-of-light' },
      turnstileToken: 'pass-1',
    });
    expect(resets).toBe(1);
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
  });

  it('signs in without waiting when the site has no bot check', async () => {
    const { http, button } = await render('');
    expect(button.disabled).toBe(false);

    button.click();

    expect(JSON.parse(http.expectOne('/api/users/login').request.body)).toEqual({
      user: { email: 'alisaie@example.com', password: 'echo-of-light' },
    });
  });

  describe('coming from a link in the Everise Discord', () => {
    @Component({ template: '' })
    class PostPage {}

    it('says why, then goes back to the link once signed in', async () => {
      sessionStorage.setItem('returnUrl', '/article/post-1?from=discord');
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([
            { path: 'login', component: LoginComponent },
            { path: 'article/:id', component: PostPage },
          ]),
          { provide: API_URL, useValue: '/api' },
          { provide: TURNSTILE_SITE_KEY, useValue: '' },
        ],
      });
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/login?from=discord');
      const page = harness.fixture.nativeElement as HTMLElement;
      expect(page.querySelector('.from-discord')?.textContent).toContain('shared in the Everise Discord');

      for (const [id, value] of [
        ['email', 'alisaie@example.com'],
        ['password', 'echo-of-light'],
      ]) {
        const input = page.querySelector(`#${id}`) as HTMLInputElement;
        input.value = value;
        input.dispatchEvent(new Event('input'));
      }
      await harness.fixture.whenStable();
      (page.querySelector('[data-testid=sign-in]') as HTMLButtonElement).click();
      TestBed.inject(HttpTestingController)
        .expectOne('/api/users/login')
        .flush({ user: { id: 'u1', username: 'alisaie' } });
      await harness.fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/article/post-1?from=discord');
      expect(sessionStorage.getItem('returnUrl')).toBeNull();
    });
  });
});
