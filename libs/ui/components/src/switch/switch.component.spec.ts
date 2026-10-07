import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwitchComponent } from './switch.component';

@Component({
  imports: [SwitchComponent],
  template: `
    <fieldset [disabled]="off()">
      <cdt-switch [(checked)]="on" onIcon="moon" offIcon="sun">Dark mode</cdt-switch>
    </fieldset>
  `,
})
class HostComponent {
  readonly on = signal(false);
  readonly off = signal(false);
}

async function render() {
  await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const button = root.querySelector('button') as HTMLButtonElement;
  return { fixture, root, button };
}

describe('SwitchComponent', () => {
  it('is a button with the switch role, named by its label', async () => {
    const { button } = await render();

    expect(button.type).toBe('button');
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.textContent?.trim()).toBe('Dark mode');
    expect(button.getAttribute('aria-checked')).toBe('false');
  });

  it('flips on a press and follows its two-way binding', async () => {
    const { fixture, button } = await render();

    button.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.on()).toBe(true);
    expect(button.getAttribute('aria-checked')).toBe('true');

    fixture.componentInstance.on.set(false);
    await fixture.whenStable();
    expect(button.getAttribute('aria-checked')).toBe('false');
  });

  it('shows the icon for its state in the knob, hidden from screen readers', async () => {
    const { fixture, root, button } = await render();

    expect(root.querySelector('.track')?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('cdt-icon')?.getAttribute('data-icon')).toBe('sun');

    button.click();
    await fixture.whenStable();
    expect(root.querySelector('cdt-icon')?.getAttribute('data-icon')).toBe('moon');
  });

  it('is disabled by a disabled fieldset', async () => {
    const { fixture, button } = await render();

    fixture.componentInstance.off.set(true);
    await fixture.whenStable();
    expect(button.matches(':disabled')).toBe(true);
  });
});
