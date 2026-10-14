import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
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

  it('tells guests everything is free, and why a few things need signing in', async () => {
    const guest = await render(false);
    expect(guest.page.querySelector('cdt-banner .free')?.textContent).toContain('Everything on Everise is free.');
  });

  it('shows it to members, and once a guest signs in', async () => {
    const { fixture, page, authStore, widgetRequests } = await render(false);

    authStore.loggedIn.set(true);
    await fixture.whenStable();

    expect(page.querySelector('cdt-discord-widget')).not.toBeNull();
    expect(widgetRequests()).toHaveLength(1);
    // Members know what's free: no note for them.
    expect(page.querySelector('cdt-banner .free')).toBeNull();
  });
});

describe('HomeComponent tabs', () => {
  async function render() {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { loggedIn: signal(false) } },
        { provide: LiveUpdates, useValue: { events$: NEVER } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: HomeComponent }]),
        { provide: API_URL, useValue: '' },
      ],
    });
    const harness = await RouterTestingHarness.create('/');
    const page = harness.routeNativeElement as HTMLElement;
    const tab = (name: string) =>
      [...page.querySelectorAll<HTMLButtonElement>('[cdtTab]')].find((t) => t.textContent?.trim() === name);
    return { harness, page, tab, http: TestBed.inject(HttpTestingController), router: TestBed.inject(Router) };
  }

  it('shows the Weekly and Hunts tabs to guests too, each in the address, and the feeds again', async () => {
    const { harness, page, tab, http, router } = await render();

    tab('Weekly')?.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/?view=weekly');
    expect(tab('Weekly')?.getAttribute('aria-current') ?? tab('Weekly')?.className).toMatch(/true|active/);
    expect(page.querySelector('cdt-weekly')).not.toBeNull();
    expect(page.querySelector('cdt-article-list')).toBeNull();
    expect(http.match('/weekly')).toHaveLength(1);

    tab('Hunts')?.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/?view=hunts');
    expect(page.querySelector('cdt-hunts')).not.toBeNull();
    expect(page.querySelector('h2.visually-hidden')?.textContent).toBe('Hunt trains');

    tab('Global Feed')?.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(router.url).toBe('/');
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('cdt-article-list')).not.toBeNull();
    expect(root.querySelector('cdt-hunts')).toBeNull();
  });
});
