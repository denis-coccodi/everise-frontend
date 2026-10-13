import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from '@everise/core/http-client';

import { NavbarComponent } from './navbar.component';

@Component({ template: '' })
class BlankComponent {}

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([{ path: '**', component: BlankComponent }]),
        // The bell's notifications, for a signed-in member.
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('user', { id: 'u1', email: '', username: 'Tataru', bio: '', image: '' });
    fixture.componentRef.setInput('isLoggedIn', false);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
  });

  afterEach(() => document.body.replaceChildren());

  const page = () => fixture.nativeElement as HTMLElement;
  const toggle = () => page().querySelector('button.menu-toggle') as HTMLButtonElement;
  const panel = () => page().querySelector('#site-menu') as HTMLElement;

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each([false, true])(
    'links to the roulette whether or not someone is logged in (logged in: %s)',
    async (loggedIn) => {
      fixture.componentRef.setInput('isLoggedIn', loggedIn);
      await fixture.whenStable();

      const roulette = page().querySelector('a[href^="/roulette"]');
      expect(roulette?.textContent).toContain('Roulette');
    },
  );

  it('opens the roulette with Dungeons, Trials — Normal and Raids — Normal ticked, and marks it current whatever is ticked', async () => {
    const roulette = () => page().querySelector('a[href^="/roulette"]') as HTMLAnchorElement;
    expect(roulette().getAttribute('href')).toBe('/roulette?types=1,3,6');

    await TestBed.inject(Router).navigateByUrl('/roulette?types=0&roulettes=r1');
    await fixture.whenStable();
    expect(roulette().getAttribute('aria-current')).toBe('page');
  });

  it('opens the Party Finder on Light from Odin, and marks it current whatever is picked', async () => {
    const partyFinder = () => page().querySelector('a[href^="/party-finder"]') as HTMLAnchorElement;
    expect(partyFinder().getAttribute('href')).toBe('/party-finder?dc=light&world=odin');

    await TestBed.inject(Router).navigateByUrl('/party-finder?dc=chaos&slot=healer');
    await fixture.whenStable();
    expect(partyFinder().getAttribute('aria-current')).toBe('page');
  });

  it('opens and closes the phone menu with its button', async () => {
    expect(toggle().textContent?.trim()).toBe('Menu');
    expect(toggle().getAttribute('aria-controls')).toBe('site-menu');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(panel().classList).not.toContain('open');
    // Drawn in the page, so it shows even when no icon font loads.
    expect(toggle().querySelector('cdt-icon')?.getAttribute('data-icon')).toBe('menu');
    expect(toggle().querySelector('svg')).toBeTruthy();

    toggle().click();
    await fixture.whenStable();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(panel().classList).toContain('open');
    expect(toggle().querySelector('cdt-icon')?.getAttribute('data-icon')).toBe('close');

    toggle().click();
    await fixture.whenStable();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape and gives the focus back to the button', async () => {
    toggle().click();
    await fixture.whenStable();
    (panel().querySelector('a') as HTMLElement).focus();

    panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(panel().classList).not.toContain('open');
    expect(document.activeElement).toBe(toggle());
  });

  it('closes on a click outside it, and on going to a page', async () => {
    toggle().click();
    await fixture.whenStable();
    document.body.click();
    await fixture.whenStable();
    expect(panel().classList).not.toContain('open');

    toggle().click();
    await fixture.whenStable();
    await TestBed.inject(Router).navigateByUrl('/roulette');
    await fixture.whenStable();
    expect(panel().classList).not.toContain('open');
  });

  it('has the notifications bell for signed-in members only: before the account on wide screens, before Menu on phones', async () => {
    expect(page().querySelector('cdt-notifications')).toBeNull();

    fixture.componentRef.setInput('isLoggedIn', true);
    await fixture.whenStable();

    // In the links, just before the account menu (shown from md up).
    const items = [...panel().querySelectorAll(':scope > ul > li.wide-only')];
    expect(items.map((item) => item.firstElementChild?.tagName.toLowerCase())).toEqual([
      'cdt-notifications',
      'cdt-menu',
    ]);
    // In the bar, just before the Menu button, outside the folding menu (phones only).
    const actions = page().querySelector('.bar-actions.narrow-only') as HTMLElement;
    expect([...actions.children].map((child) => child.tagName.toLowerCase())).toEqual(['cdt-notifications', 'button']);
    expect(actions.lastElementChild).toBe(toggle());
    expect(panel().contains(actions)).toBe(false);
    // Each bell's own panel.
    const ids = [...page().querySelectorAll('cdt-notifications section.panel')].map((p) => p.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("lists the account's links in the phone menu once signed in", async () => {
    fixture.componentRef.setInput('isLoggedIn', true);
    await fixture.whenStable();

    const heading = panel().querySelector('button.account-heading') as HTMLButtonElement;
    const links = panel().querySelector('#account-links') as HTMLElement;
    expect(heading.textContent?.trim()).toBe('Tataru');
    expect(heading.getAttribute('aria-expanded')).toBe('false');
    expect(links.hidden).toBe(true);

    heading.click();
    await fixture.whenStable();
    expect(heading.getAttribute('aria-expanded')).toBe('true');
    expect(links.hidden).toBe(false);
    const items = [...links.querySelectorAll('.nav-link')].map((item) => item.textContent?.trim());
    expect(items).toEqual(['Your profile', 'Settings', 'Sign out']);
    expect(links.querySelector('a[href="/profile/u1"]')).not.toBeNull();

    // Closing and reopening the panel folds them again.
    toggle().click();
    toggle().click();
    await fixture.whenStable();
    expect(heading.getAttribute('aria-expanded')).toBe('false');

    let signedOut = false;
    component.logout.subscribe(() => (signedOut = true));
    (panel().querySelector('button.sign-out') as HTMLButtonElement).click();
    expect(signedOut).toBe(true);
  });
});
