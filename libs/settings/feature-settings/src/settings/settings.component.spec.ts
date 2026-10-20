import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '@everise/auth/data-access';
import { User } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { provideRouter } from '@angular/router';
import { SettingsStore } from '@everise/settings/data-access';
import { SettingsComponent } from './settings.component';

function fakeAuthStore(user: User) {
  return {
    user: signal(user),
    getUserLoaded: signal(true),
    imageBusy: signal(false),
    imageError: signal<string | null>(null),
    setImageError: () => undefined,
    updateUser: vi.fn(),
    uploadImage: () => undefined,
    removeImage: () => undefined,
  };
}

const user: User = {
  id: 'u1',
  email: 'urianger@example.com',
  username: 'Urianger',
  token: 'token',
  bio: null,
  image: '/a.png',
  darkMode: false,
  role: 'user',
  signInMethods: ['password'],
  pendingEmail: null,
};

async function render(as: User = user) {
  const authStore = fakeAuthStore(as);
  TestBed.configureTestingModule({
    imports: [SettingsComponent],
    providers: [
      { provide: AuthStore, useValue: authStore },
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_URL, useValue: '' },
    ],
  });
  const fixture = TestBed.createComponent(SettingsComponent);
  await fixture.whenStable();
  const page = fixture.nativeElement as HTMLElement;
  const darkMode = page.querySelector('.appearance [role=switch]') as HTMLButtonElement;
  return { fixture, page, darkMode, authStore, settings: TestBed.inject(SettingsStore) };
}

describe('SettingsComponent dark mode', () => {
  afterEach(() => localStorage.clear());

  it('is a labelled part of the form, showing the saved mode', async () => {
    const { page, darkMode } = await render();

    expect(page.querySelector('form .appearance legend')?.textContent?.trim()).toBe('Appearance');
    expect(darkMode.textContent?.trim()).toBe('Dark mode');
    expect(darkMode.getAttribute('aria-checked')).toBe('false');
  });

  it('previews a change at once and saves it with the other settings', async () => {
    const { fixture, page, darkMode, authStore, settings } = await render();

    darkMode.click();
    await fixture.whenStable();
    expect(settings.darkMode()).toBe(true);

    (page.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(authStore.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ darkMode: true, username: 'Urianger', bio: '' }),
    );
  });

  it("leaves the mode to the default when saving other settings for someone who hasn't chosen one", async () => {
    const { fixture, page, authStore } = await render({ ...user, darkMode: undefined });

    (page.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(authStore.updateUser).toHaveBeenCalledWith(expect.objectContaining({ username: 'Urianger' }));
    expect(authStore.updateUser).not.toHaveBeenCalledWith(expect.objectContaining({ darkMode: expect.anything() }));
  });

  it('puts the saved mode back when left without saving', async () => {
    const { fixture, darkMode, settings } = await render();

    darkMode.click();
    await fixture.whenStable();
    expect(settings.darkMode()).toBe(true);

    fixture.destroy();
    expect(settings.darkMode()).toBe(false);
  });

  it("shows the characters' and the members' windows to admins only", async () => {
    const member = await render();
    expect(member.page.querySelector('cdt-admin-characters')).toBeNull();
    expect(member.page.querySelector('cdt-admin-members')).toBeNull();

    TestBed.resetTestingModule();
    const admin = await render({ ...user, role: 'admin' });
    expect(admin.page.querySelector('cdt-admin-characters')).not.toBeNull();
    expect(admin.page.querySelector('cdt-admin-members')).not.toBeNull();
  });
});

describe('SettingsComponent profile', () => {
  afterEach(() => localStorage.clear());

  it('keeps the email and password out of the profile form, in the account section', async () => {
    const { page, authStore } = await render();

    expect(page.querySelector('form #email')).toBeNull();
    expect(page.querySelector('form #password')).toBeNull();
    expect(page.querySelector('cdt-account-security')).not.toBeNull();

    (page.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(Object.keys(authStore.updateUser.mock.calls[0][0]).sort()).toEqual(['bio', 'darkMode', 'username']);
  });
});
