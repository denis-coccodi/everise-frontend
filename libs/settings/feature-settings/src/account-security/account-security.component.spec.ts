import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { SignInMethod, User } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { AccountSecurityComponent } from './account-security.component';

const ALPHINAUD: User = {
  id: 'u1',
  email: 'alphinaud@example.com',
  username: 'Alphinaud',
  token: 'token',
  bio: null,
  image: '/a.png',
  darkMode: true,
  role: 'user',
  signInMethods: ['password'],
  pendingEmail: null,
};

describe('AccountSecurityComponent', () => {
  async function render(signInMethods: SignInMethod[] = ['password']) {
    TestBed.configureTestingModule({
      imports: [AccountSecurityComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '' },
      ],
    });
    const authStore = TestBed.inject(AuthStore);
    patchState(unprotected(authStore), { user: { ...ALPHINAUD, signInMethods }, loggedIn: true });
    const fixture = TestBed.createComponent(AccountSecurityComponent);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/auth/providers').flush({ providers: [] });
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const button = (text: string) =>
      [...page.querySelectorAll('button, a')].find((b) => b.textContent?.trim() === text) as HTMLElement;
    const type = async (id: string, value: string) => {
      const input = page.querySelector(`#${id}`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    const dialog = () => page.querySelector('[role=dialog]') as HTMLElement | null;
    return { fixture, page, http, authStore, button, type, dialog };
  }

  it('shows the email and that a password is set, each with its own button', async () => {
    const { page, button } = await render();

    expect(page.querySelector('h2')?.textContent?.trim()).toBe('Account security');
    const rows = [...page.querySelectorAll('.item')].map((row) =>
      [...row.querySelectorAll('.name, .value')].map((part) => part.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['Email', 'alphinaud@example.com'],
      ['Password', 'Set. Changing it signs you out on your other devices.'],
    ]);
    expect(button('Change email')).toBeDefined();
    expect(button('Change password')).toBeDefined();
  });

  it('changes the email in its window with the current password, then says where the link went', async () => {
    const { fixture, page, http, authStore, button, type, dialog } = await render();

    button('Change email').click();
    await fixture.whenStable();
    expect(dialog()?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialog()?.textContent).toContain('Change email');
    await type('new-email', 'alphinaud@sharlayan.example');
    await type('email-current-password', 'old-crystal');
    (dialog()?.querySelector('[type=submit]') as HTMLButtonElement).click();

    const request = http.expectOne('/user');
    expect(request.request.method).toBe('PUT');
    expect(JSON.parse(request.request.body)).toEqual({
      user: { email: 'alphinaud@sharlayan.example', currentPassword: 'old-crystal' },
    });
    request.flush({ user: { ...ALPHINAUD, pendingEmail: 'alphinaud@sharlayan.example' } });
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(authStore.user().pendingEmail).toBe('alphinaud@sharlayan.example');
    expect(page.querySelector('cdt-message.done')?.textContent).toContain(
      'We sent a link to alphinaud@sharlayan.example.',
    );
    expect(page.textContent).toContain('Waiting for you to open the link sent to alphinaud@sharlayan.example.');
  });

  it("keeps the window open with the server's message when the current password is wrong", async () => {
    const { fixture, http, button, type, dialog } = await render();

    button('Change password').click();
    await fixture.whenStable();
    await type('current-password', 'not-it');
    await type('new-password', 'new-crystal-1');
    await type('repeat-password', 'new-crystal-1');
    (dialog()?.querySelector('[type=submit]') as HTMLButtonElement).click();
    http
      .expectOne('/user')
      .flush(
        { errors: { body: ['Your current password is wrong.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await fixture.whenStable();

    expect(dialog()?.querySelector('[role=alert]')?.textContent?.trim()).toBe('Your current password is wrong.');
  });

  it('changes the password in its window and says other devices were signed out', async () => {
    const { fixture, page, http, button, type, dialog } = await render();

    button('Change password').click();
    await fixture.whenStable();
    await type('current-password', 'old-crystal');
    await type('new-password', 'new-crystal-1');
    await type('repeat-password', 'new-crystal-1');
    (dialog()?.querySelector('[type=submit]') as HTMLButtonElement).click();

    const request = http.expectOne('/user');
    expect(JSON.parse(request.request.body)).toEqual({
      user: { currentPassword: 'old-crystal', password: 'new-crystal-1' },
    });
    request.flush({ user: ALPHINAUD });
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(page.querySelector('cdt-message.done')?.textContent).toContain('Your password is changed.');
  });

  it('closes a window on Cancel without asking anything', async () => {
    const { fixture, http, button, dialog } = await render();

    button('Change email').click();
    await fixture.whenStable();
    button('Cancel').click();
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    http.verify();
  });

  it('offers an account without a password to set one with a code, its address filled in', async () => {
    const { fixture, page, button } = await render(['google']);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    expect(page.textContent).toContain('Not set: you sign in with a connected account below.');
    const set = button('Set a password');
    expect(set.getAttribute('href')).toBe('/forgot-password');
    set.click();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ state: { resetEmail: 'alphinaud@example.com' } }),
    );
  });

  it('signs out on every device', async () => {
    const { http, authStore, button } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    button('Sign out everywhere').click();
    http.expectOne('/users/logout-everywhere').flush(null);

    expect(authStore.loggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('login');
  });
});
