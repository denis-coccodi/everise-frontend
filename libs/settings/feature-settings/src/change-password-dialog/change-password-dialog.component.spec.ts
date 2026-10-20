import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountChangesStore, AuthStore } from '@everise/auth/data-access';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { API_URL } from '@everise/core/http-client';
import { ChangePasswordDialogComponent } from './change-password-dialog.component';

describe('ChangePasswordDialogComponent', () => {
  async function render() {
    TestBed.configureTestingModule({
      imports: [ChangePasswordDialogComponent],
      providers: [
        AccountChangesStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '' },
      ],
    });
    const authStore = TestBed.inject(AuthStore);
    patchState(unprotected(authStore), { user: { ...authStore.user(), email: 'yda@example.com' } });
    const fixture = TestBed.createComponent(ChangePasswordDialogComponent);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const type = async (id: string, value: string) => {
      const input = page.querySelector(`#${id}`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return { page, type, submit: () => page.querySelector('[type=submit]') as HTMLButtonElement };
  }

  it('starts on the current password, with a way out if it is forgotten', async () => {
    const { page } = await render();

    expect(document.activeElement?.id).toBe('current-password');
    expect(page.querySelector('a.forgot')?.getAttribute('href')).toBe('/forgot-password');
  });

  it('takes the new password twice, the same, of 8 to 72 characters', async () => {
    const { page, type, submit } = await render();
    await type('current-password', 'old-crystal');

    await type('new-password', 'short');
    expect(page.textContent).toContain('Use at least 8 characters.');
    await type('new-password', 'new-crystal-1');
    await type('repeat-password', 'new-crystal-2');
    expect(page.textContent).toContain("The two passwords don't match.");
    expect(submit().disabled).toBe(true);

    await type('repeat-password', 'new-crystal-1');
    expect(submit().disabled).toBe(false);
  });

  it('shows the account as text, which takes no focus', async () => {
    const { page } = await render();

    expect(page.querySelector('.what')?.textContent).toContain('The password of yda@example.com.');
    expect(document.activeElement?.id).toBe('current-password');
  });

  // What Chrome and other password managers read to suggest a strong
  // password and save it for this account.
  it("names the account to password managers, and marks each password's role", async () => {
    const { page } = await render();
    const form = page.querySelector('form') as HTMLFormElement;
    const username = form.querySelector('input[autocomplete=username]') as HTMLInputElement;

    expect(username.value).toBe('yda@example.com');
    expect(username.hidden).toBe(true);
    expect([...form.querySelectorAll('input[type=password]')].map((i) => i.getAttribute('autocomplete'))).toEqual([
      'current-password',
      'new-password',
      'new-password',
    ]);
  });

  it('can show the current and the new password', async () => {
    const { page } = await render();

    expect([...page.querySelectorAll('cdt-show-password button')].map((b) => b.getAttribute('aria-controls'))).toEqual([
      'current-password',
      'new-password',
    ]);
  });
});
