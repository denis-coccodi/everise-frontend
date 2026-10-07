import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageComponent, MessageTone } from './message.component';

@Component({
  imports: [MessageComponent],
  template: `<cdt-message [tone]="tone()">{{ text() }}</cdt-message>`,
})
class HostComponent {
  readonly tone = signal<MessageTone>('status');
  readonly text = signal('Saved.');
}

describe('MessageComponent', () => {
  it('is a polite live region for a status or warning, an alert for an error', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const message = (fixture.nativeElement as HTMLElement).querySelector('cdt-message') as HTMLElement;

    expect(message.getAttribute('role')).toBe('status');
    expect(message.textContent).toBe('Saved.');

    fixture.componentInstance.tone.set('warning');
    await fixture.whenStable();
    expect(message.getAttribute('role')).toBe('status');

    fixture.componentInstance.tone.set('error');
    await fixture.whenStable();
    expect(message.getAttribute('role')).toBe('alert');
    expect(message.getAttribute('data-tone')).toBe('error');
  });
});
