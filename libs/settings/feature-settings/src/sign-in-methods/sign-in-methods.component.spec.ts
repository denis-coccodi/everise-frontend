import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '@realworld/auth/data-access';
import { SignInMethod } from '@realworld/core/api-types';
import { API_URL } from '@realworld/core/http-client';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { SignInMethodsComponent } from './sign-in-methods.component';

describe('SignInMethodsComponent', () => {
  async function render(signInMethods: SignInMethod[], available: string[]) {
    TestBed.configureTestingModule({
      imports: [SignInMethodsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '' }],
    });
    const store = TestBed.inject(AuthStore);
    patchState(unprotected(store), { user: { ...store.user(), signInMethods } });
    const fixture = TestBed.createComponent(SignInMethodsComponent);
    TestBed.inject(HttpTestingController).expectOne('/auth/providers').flush({ providers: available });
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    return [...page.querySelectorAll('.method')].map((li) =>
      [...li.querySelectorAll('.name, .state')].map((part) => part.textContent?.replace(/\s+/g, ' ').trim()).join(' '),
    );
  }

  it('shows the password and the tied accounts in words', async () => {
    expect(await render(['password', 'google'], ['google', 'facebook'])).toEqual([
      'Email and password Set',
      'Google Tied to this account',
      'Facebook Not tied: sign out, then "Continue with Facebook" with this account\'s email ties it.',
    ]);
  });

  it('says when there is no password, and lists a tied provider even if it is no longer offered', async () => {
    expect(await render(['facebook'], [])).toEqual([
      'Email and password Not set: add a password below to also sign in with your email.',
      'Facebook Tied to this account',
    ]);
  });
});
