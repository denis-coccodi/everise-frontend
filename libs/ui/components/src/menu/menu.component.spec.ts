import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuComponent } from './menu.component';
import { MenuItemComponent } from '../menu-item/menu-item.component';

@Component({
  imports: [MenuComponent, MenuItemComponent],
  template: `
    <cdt-menu label="Account">
      <span cdtMenuTrigger>denis</span>
      <a cdtMenuItem href="/profile">Your profile</a>
      <a cdtMenuItem href="/settings">Settings</a>
      <button cdtMenuItem type="button" [divided]="true" (click)="signedOut.set(true)">Sign out</button>
    </cdt-menu>
    <button type="button" class="outside">Elsewhere</button>
  `,
})
class HostComponent {
  readonly signedOut = signal(false);
}

describe('MenuComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let page: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    page = fixture.nativeElement;
    document.body.appendChild(page);
    await fixture.whenStable();
  });

  afterEach(() => page.remove());

  const trigger = () => page.querySelector('.trigger') as HTMLButtonElement;
  const panel = () => page.querySelector('[role="menu"]') as HTMLElement;
  const items = () => [...page.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  const key = async (target: HTMLElement, key: string) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await fixture.whenStable();
  };

  it('is a closed menu button showing the trigger content', () => {
    expect(trigger().textContent).toContain('denis');
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(panel().hidden).toBe(true);
    expect(panel().getAttribute('aria-label')).toBe('Account');
    expect(items().map((i) => i.getAttribute('tabindex'))).toEqual(['-1', '-1', '-1']);
  });

  it('opens on click with the focus on the first item, and moves with the arrow keys', async () => {
    trigger().click();
    await fixture.whenStable();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(panel().hidden).toBe(false);
    expect(document.activeElement).toBe(items()[0]);

    await key(items()[0], 'ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    await key(items()[1], 'End');
    expect(document.activeElement).toBe(items()[2]);
    // Wraps around.
    await key(items()[2], 'ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
  });

  it('opens on the last item with the up arrow', async () => {
    await key(trigger(), 'ArrowUp');

    expect(document.activeElement?.textContent?.trim()).toBe('Sign out');
  });

  it('closes on Escape and returns the focus to the button', async () => {
    trigger().click();
    await fixture.whenStable();

    await key(items()[0], 'Escape');

    expect(panel().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('runs a chosen item and closes', async () => {
    trigger().click();
    await fixture.whenStable();

    items()[2].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.signedOut()).toBe(true);
    expect(panel().hidden).toBe(true);
  });

  it('closes on a click outside', async () => {
    trigger().click();
    await fixture.whenStable();

    (page.querySelector('.outside') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(panel().hidden).toBe(true);
  });

  it('sets apart a divided item', () => {
    expect(items()[2].classList).toContain('divided');
    expect(items()[0].classList).not.toContain('divided');
  });
});
