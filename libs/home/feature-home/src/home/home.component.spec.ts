import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { API_URL, LiveUpdates } from '@everise/core/http-client';
import { NEVER } from 'rxjs';
import { HomeComponent } from './home.component';

describe('HomeComponent Discord box', () => {
  async function render(loggedIn: boolean) {
    const authStore = { loggedIn: signal(loggedIn) };
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: AuthStore, useValue: authStore },
        { provide: LiveUpdates, useValue: { events$: NEVER } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '' },
      ],
    });
    const fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
    const http = TestBed.inject(HttpTestingController);
    const widgetRequests = () => http.match((request) => request.url === '/discord/widget');
    return { fixture, page: fixture.nativeElement as HTMLElement, authStore, widgetRequests };
  }

  it("doesn't show guests who's on Discord, nor ask for it", async () => {
    const { page, widgetRequests } = await render(false);

    expect(page.querySelector('cdt-discord-widget')).toBeNull();
    expect(page.querySelector('aside[aria-label="Discord"]')).toBeNull();
    expect(widgetRequests()).toHaveLength(0);
  });

  it('shows it to members, and once a guest signs in', async () => {
    const { fixture, page, authStore, widgetRequests } = await render(false);

    authStore.loggedIn.set(true);
    await fixture.whenStable();

    expect(page.querySelector('aside[aria-label="Discord"] cdt-discord-widget')).not.toBeNull();
    expect(widgetRequests()).toHaveLength(1);
  });
});
