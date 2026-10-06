import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@realworld/core/http-client';
import { CheckEmailComponent } from './check-email.component';

describe('CheckEmailComponent', () => {
  async function render() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    const fixture = TestBed.createComponent(CheckEmailComponent);
    fixture.componentRef.setInput('email', 'alisaie@example.com');
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      page,
      http: TestBed.inject(HttpTestingController),
      button: page.querySelector('button') as HTMLButtonElement,
      status: () => page.querySelector('[role=status]')?.textContent?.trim(),
    };
  }

  it('says where the link went, in a named region', async () => {
    const { page } = await render();

    expect(page.querySelector('[role=region]')?.getAttribute('aria-label')).toBe('Check your email');
    expect(page.textContent).toContain('We sent a link to alisaie@example.com.');
  });

  it('sends the link again, and announces it', async () => {
    const { fixture, http, button, status } = await render();

    button.click();
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
    const request = http.expectOne('/api/users/confirm-email/resend');
    expect(JSON.parse(request.request.body)).toEqual({ user: { email: 'alisaie@example.com' } });
    request.flush({ confirmation: { email: 'alisaie@example.com' } }, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();

    expect(status()).toBe('Sent again to alisaie@example.com.');
    expect(button.disabled).toBe(false);
  });

  it("passes on the backend's reason when it's too soon", async () => {
    const { fixture, http, button, status } = await render();

    button.click();
    http
      .expectOne('/api/users/confirm-email/resend')
      .flush(
        { errors: { body: ["We've just sent a link. Try again in 42 seconds."] } },
        { status: 429, statusText: 'Too Many Requests' },
      );
    await fixture.whenStable();

    expect(status()).toBe("We've just sent a link. Try again in 42 seconds.");
  });
});
