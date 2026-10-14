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
  async function render(loggedIn = false, address = '/') {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { loggedIn: signal(loggedIn) } },
        { provide: LiveUpdates, useValue: { events$: NEVER } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: HomeComponent }]),
        { provide: API_URL, useValue: '' },
      ],
    });
    const harness = await RouterTestingHarness.create(address);
    await harness.fixture.whenStable();
    const page = () => harness.fixture.nativeElement as HTMLElement;
    const tabs = () =>
      [...page().querySelectorAll<HTMLButtonElement>('[cdtTab]')].filter((t) => !t.closest('[hidden]'));
    const tab = (name: string) => tabs().find((t) => t.textContent?.trim() === name);
    async function click(name: string) {
      tab(name)?.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
    }
    const http = TestBed.inject(HttpTestingController);
    // The feeds' requests since the last look (the Global Feed's /articles, Your
    // Feed's /articles/feed), answered as the backend would.
    const postRequests = () =>
      http
        .match((request) => request.url.startsWith('/articles'))
        .map((request) => {
          request.flush({ articles: [], articlesCount: 0 });
          return request.request.url;
        });
    return { page, tabs, tab, click, http, postRequests, router: TestBed.inject(Router) };
  }

  it('opens on Weekly, then Hunts and the Global Feed, each at its own address; posts load only for a feed', async () => {
    const { page, tabs, tab, click, http, postRequests, router } = await render();

    // Guests: no Your Feed.
    expect(tabs().map((t) => t.textContent?.trim())).toEqual(['Weekly', 'Hunts', 'Global Feed']);
    expect(router.url).toBe('/');
    expect(tab('Weekly')?.className).toMatch(/active/);
    expect(page().querySelector('cdt-weekly')).not.toBeNull();
    expect(http.match('/weekly')).toHaveLength(1);
    expect(postRequests()).toEqual([]);

    await click('Hunts');
    expect(router.url).toBe('/?view=hunts');
    expect(page().querySelector('cdt-hunts')).not.toBeNull();
    expect(page().querySelector('h2.visually-hidden')?.textContent).toBe('Hunt trains');

    await click('Global Feed');
    expect(router.url).toBe('/?view=global');
    expect(page().querySelector('cdt-article-list')).not.toBeNull();
    expect(page().querySelector('cdt-hunts')).toBeNull();
    expect(postRequests()).toEqual(['/articles']);

    await click('Weekly');
    expect(router.url).toBe('/');
    expect(page().querySelector('cdt-weekly')).not.toBeNull();
  });

  it('gives members Your Feed, after Hunts, at its own address', async () => {
    const { tabs, tab, click, postRequests, router } = await render(true);

    expect(tabs().map((t) => t.textContent?.trim())).toEqual(['Weekly', 'Hunts', 'Your Feed', 'Global Feed']);

    await click('Your Feed');
    expect(router.url).toBe('/?view=yours');
    expect(tab('Your Feed')?.className).toMatch(/active/);
    expect(tab('Global Feed')?.className).not.toMatch(/active/);
    expect(postRequests()).toEqual(['/articles/feed']);

    await click('Global Feed');
    expect(router.url).toBe('/?view=global');
    expect(postRequests()).toEqual(['/articles']);
  });

  it('opens a link to Your Feed on it for a member, and on the Global Feed for a guest', async () => {
    const member = await render(true, '/?view=yours');
    expect(member.tab('Your Feed')?.className).toMatch(/active/);
    expect(member.postRequests()).toEqual(['/articles/feed']);
    TestBed.resetTestingModule();

    const guest = await render(false, '/?view=yours');
    expect(guest.tab('Global Feed')?.className).toMatch(/active/);
    expect(guest.postRequests()).toEqual(['/articles']);
  });
});
