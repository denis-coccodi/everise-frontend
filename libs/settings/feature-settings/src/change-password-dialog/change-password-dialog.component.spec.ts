import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountChangesStore } from '@everise/auth/data-access';
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
});
