import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '@everise/auth/data-access';
import { SignInMethod } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { provideRouter } from '@angular/router';
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

  it('shows the tied accounts and the ones that could be, in words', async () => {
    expect(await render(['password', 'google'], ['google', 'discord'])).toEqual([
      'Google Tied to this account',
      'Discord Not tied: sign out, then "Continue with Discord" with this account\'s email ties it.',
    ]);
  });

  it('lists a tied provider even if it is no longer offered', async () => {
    expect(await render(['discord'], [])).toEqual(['Discord Tied to this account']);
  });

  it('shows nothing when no provider is tied or offered', async () => {
    expect(await render(['password'], [])).toEqual([]);
    expect(document.querySelector('cdt-sign-in-methods h3')).toBeNull();
  });
});
