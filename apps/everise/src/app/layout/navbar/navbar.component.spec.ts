import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { NavbarComponent } from './navbar.component';

@Component({ template: '' })
class BlankComponent {}

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([{ path: '**', component: BlankComponent }])],
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

      const roulette = page().querySelector('a[href="/roulette"]');
      expect(roulette?.textContent).toContain('Roulette');
    },
  );

  it('opens and closes the phone menu with its button', async () => {
    expect(toggle().textContent?.trim()).toBe('Menu');
    expect(toggle().getAttribute('aria-controls')).toBe('site-menu');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(panel().classList).not.toContain('open');

    toggle().click();
    await fixture.whenStable();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(panel().classList).toContain('open');

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

  it("lists the account's links in the phone menu once signed in", async () => {
    fixture.componentRef.setInput('isLoggedIn', true);
    await fixture.whenStable();

    const flat = [...panel().querySelectorAll('.narrow-only')].map((item) => item.textContent?.trim());
    expect(flat).toEqual(['Tataru', 'Your profile', 'Settings', 'Sign out']);
    expect(panel().querySelector('.narrow-only a[href="/profile/u1"]')).not.toBeNull();

    let signedOut = false;
    component.logout.subscribe(() => (signedOut = true));
    (panel().querySelector('button.sign-out') as HTMLButtonElement).click();
    expect(signedOut).toBe(true);
  });
});
