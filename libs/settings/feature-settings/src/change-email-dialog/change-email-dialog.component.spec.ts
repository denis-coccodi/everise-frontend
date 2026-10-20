import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountChangesStore } from '@everise/auth/data-access';
import { API_URL } from '@everise/core/http-client';
import { ChangeEmailDialogComponent } from './change-email-dialog.component';

describe('ChangeEmailDialogComponent', () => {
  async function render(hasPassword: boolean) {
    TestBed.configureTestingModule({
      imports: [ChangeEmailDialogComponent],
      providers: [
        AccountChangesStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '' },
      ],
    });
    const fixture = TestBed.createComponent(ChangeEmailDialogComponent);
    fixture.componentRef.setInput('currentEmail', 'yda@example.com');
    fixture.componentRef.setInput('hasPassword', hasPassword);
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  it('starts on the new address, and asks for the current password', async () => {
    const { page } = await render(true);

    expect(document.activeElement?.id).toBe('new-email');
    expect(page.querySelector('#email-current-password')).not.toBeNull();
  });

  it("doesn't ask an account without a password for one", async () => {
    const { page } = await render(false);

    expect(page.querySelector('#email-current-password')).toBeNull();
  });

  it('refuses the address it already has, in any letter case', async () => {
    const { fixture, page } = await render(false);
    const input = page.querySelector('#new-email') as HTMLInputElement;

    input.value = 'YDA@example.com';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(page.textContent).toContain("That's already your email address.");
    expect((page.querySelector('[type=submit]') as HTMLButtonElement).disabled).toBe(true);
  });
});
