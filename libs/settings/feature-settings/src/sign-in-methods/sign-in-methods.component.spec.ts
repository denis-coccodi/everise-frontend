import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '@everise/auth/data-access';
import { SignInMethod } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { Router, provideRouter } from '@angular/router';
import { SignInMethodsComponent } from './sign-in-methods.component';

describe('SignInMethodsComponent', () => {
  async function render(signInMethods: SignInMethod[], available: string[]) {
    TestBed.configureTestingModule({
      imports: [SignInMethodsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '' },
      ],
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
    expect(await render(['password', 'google', 'discord'], ['google', 'facebook', 'microsoft', 'discord'])).toEqual([
      'Email and password Set',
      'Google Tied to this account',
      'Facebook Not tied: sign out, then "Continue with Facebook" with this account\'s email ties it.',
      'Microsoft Not tied: sign out, then "Continue with Microsoft" with this account\'s email ties it.',
      'Discord Tied to this account',
    ]);
  });

  it('says when there is no password, and lists a tied provider even if it is no longer offered', async () => {
    expect(await render(['facebook'], [])).toEqual([
      'Email and password Not set: get a code by email to set one and also sign in with your email.',
      'Facebook Tied to this account',
    ]);
  });

  it('signs out on every device', async () => {
    await render(['password'], []);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const button = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Sign out everywhere',
    );

    button!.click();
    TestBed.inject(HttpTestingController).expectOne('/users/logout-everywhere').flush(null);

    expect(TestBed.inject(AuthStore).loggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('login');
  });
});
