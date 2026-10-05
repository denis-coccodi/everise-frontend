import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogComponent } from './dialog.component';

@Component({
  imports: [DialogComponent],
  template: `
    <button id="opener">Open</button>
    @if (open()) {
      <cdt-dialog heading="Duty Found" (dismissed)="dismissals = dismissals + 1">
        <button id="inside">OK</button>
        <button id="last">Cancel</button>
      </cdt-dialog>
    }
  `,
})
class HostComponent {
  dismissals = 0;
  readonly open = signal(true);
}

describe('DialogComponent', () => {
  it('is a labelled modal window that asks to close on backdrop click and Escape', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = (selector: string) => (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement;

    const dialog = el('[role=dialog]');
    const heading = el('h2');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.textContent?.trim()).toBe('Duty Found');

    el('.backdrop').click();
    el('#inside').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fixture.componentInstance.dismissals).toBe(2);
  });

  it('keeps the focus inside while open and gives it back when closed', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    const el = (selector: string) => (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement;
    fixture.componentInstance.open.set(false);
    await fixture.whenStable();
    el('#opener').focus();

    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    // Nothing in the content took the focus, so the window has it.
    expect(document.activeElement).toBe(el('[role=dialog]'));

    const tab = (shiftKey: boolean) =>
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }),
      );
    el('#last').focus();
    tab(false);
    expect(document.activeElement).toBe(el('#inside'));
    tab(true);
    expect(document.activeElement).toBe(el('#last'));

    fixture.componentInstance.open.set(false);
    await fixture.whenStable();
    expect(document.activeElement).toBe(el('#opener'));
    fixture.nativeElement.remove();
  });
});
