import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '@realworld/auth/data-access';
import { User } from '@realworld/core/api-types';
import { API_URL } from '@realworld/core/http-client';
import { provideRouter } from '@angular/router';
import { SettingsStore } from '@realworld/settings/data-access';
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

describe('SettingsComponent dark mode', () => {
  const user: User = {
    email: 'urianger@example.com',
    username: 'Urianger',
    bio: null as unknown as string,
    image: '/a.png',
    darkMode: false,
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
    const checkbox = page.querySelector('.appearance input[type=checkbox]') as HTMLInputElement;
    return { fixture, page, checkbox, authStore, settings: TestBed.inject(SettingsStore) };
  }

  afterEach(() => localStorage.clear());

  it('is a labelled part of the form, showing the saved mode', async () => {
    const { page, checkbox } = await render();

    expect(page.querySelector('form .appearance legend')?.textContent?.trim()).toBe('Appearance');
    expect(checkbox.closest('label')?.textContent?.trim()).toBe('Dark mode');
    expect(checkbox.checked).toBe(false);
  });

  it('previews a change at once and saves it with the other settings', async () => {
    const { fixture, page, checkbox, authStore, settings } = await render();

    checkbox.click();
    await fixture.whenStable();
    expect(settings.darkMode()).toBe(true);

    (page.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(authStore.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ darkMode: true, username: 'Urianger', bio: '' }),
    );
  });

  it('puts the saved mode back when left without saving', async () => {
    const { fixture, checkbox, settings } = await render();

    checkbox.click();
    await fixture.whenStable();
    expect(settings.darkMode()).toBe(true);

    fixture.destroy();
    expect(settings.darkMode()).toBe(false);
  });

  it("shows Tataru's and the members' windows to admins only", async () => {
    const member = await render();
    expect(member.page.querySelector('cdt-admin-tataru')).toBeNull();
    expect(member.page.querySelector('cdt-admin-members')).toBeNull();

    TestBed.resetTestingModule();
    const admin = await render({ ...user, role: 'admin' });
    expect(admin.page.querySelector('cdt-admin-tataru')).not.toBeNull();
    expect(admin.page.querySelector('cdt-admin-members')).not.toBeNull();
  });
});
