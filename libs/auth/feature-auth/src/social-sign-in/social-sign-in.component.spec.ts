import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { FormErrorsStore } from '@everise/core/forms';
import { API_URL } from '@everise/core/http-client';
import { SOCIAL_SIGN_IN_PROBLEMS, SocialSignInComponent } from './social-sign-in.component';

describe('SocialSignInComponent', () => {
  async function render(providers: string[] | 'error', query: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [SocialSignInComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      ],
    });
    const fixture = TestBed.createComponent(SocialSignInComponent);
    const request = TestBed.inject(HttpTestingController).expectOne('/api/auth/providers');
    if (providers === 'error') {
      request.flush(null, { status: 500, statusText: 'Server Error' });
    } else {
      request.flush({ providers });
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => TestBed.inject(FormErrorsStore).setErrors({}));

  it('links to the backend for each provider it is set up for', async () => {
    const page = await render(['google', 'facebook', 'microsoft', 'discord']);

    const links = [...page.querySelectorAll('a')];
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Continue with Google',
      'Continue with Facebook',
      'Continue with Microsoft',
      'Continue with Discord',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/api/auth/google',
      '/api/auth/facebook',
      '/api/auth/microsoft',
      '/api/auth/discord',
    ]);
    // The logos are decorative: the link's text names the provider.
    expect(links.map((a) => a.querySelector('img')?.getAttribute('alt'))).toEqual(['', '', '', '']);
    expect(page.querySelector('.divider')?.textContent?.trim()).toBe('or with your email');
  });

  it('shows only the providers set up, and nothing when there are none', async () => {
    expect([...(await render(['facebook'])).querySelectorAll('a')].map((a) => a.textContent?.trim())).toEqual([
      'Continue with Facebook',
    ]);
    TestBed.resetTestingModule();
    expect((await render([])).textContent?.trim()).toBe('');
    TestBed.resetTestingModule();
    expect((await render('error')).textContent?.trim()).toBe('');
  });

  it("explains why a sign-in through a provider didn't finish", async () => {
    await render(['google'], { social: 'no-email' });

    expect(TestBed.inject(FormErrorsStore).errors()).toEqual([SOCIAL_SIGN_IN_PROBLEMS['no-email']]);
  });

  it('falls back to a general message for an unknown problem', async () => {
    await render(['google'], { social: 'something-new' });

    expect(TestBed.inject(FormErrorsStore).errors()).toEqual([SOCIAL_SIGN_IN_PROBLEMS['failed']]);
  });
});
