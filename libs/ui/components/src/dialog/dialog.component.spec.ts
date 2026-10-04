import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogComponent } from './dialog.component';

@Component({
  imports: [DialogComponent],
  template: `
    <cdt-dialog heading="Duty Found" (dismissed)="dismissals = dismissals + 1">
      <button id="inside">OK</button>
    </cdt-dialog>
  `,
})
class HostComponent {
  dismissals = 0;
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
});
