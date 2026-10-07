import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TooltipComponent } from './tooltip.component';

@Component({
  imports: [TooltipComponent],
  template: `<cdt-tooltip text="Accepts: PLD, WAR" [focusable]="true">Open slot</cdt-tooltip>`,
})
class HostComponent {}

async function render() {
  await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const host = root.querySelector('cdt-tooltip') as HTMLElement;
  const trigger = root.querySelector('.trigger') as HTMLElement;
  const tip = root.querySelector('[role=tooltip]') as HTMLElement;
  return { fixture, host, trigger, tip };
}

describe('TooltipComponent', () => {
  it('describes its content for screen readers, and is a tab stop when asked', async () => {
    const { trigger, tip } = await render();

    expect(trigger.getAttribute('tabindex')).toBe('0');
    expect(trigger.getAttribute('aria-describedby')).toBe(tip.id);
    expect(tip.textContent).toBe('Accepts: PLD, WAR');
    expect(tip.classList).not.toContain('open');
  });

  it('opens on hover and focus, and Escape closes it', async () => {
    const { fixture, host, trigger, tip } = await render();

    host.dispatchEvent(new MouseEvent('mouseenter'));
    await fixture.whenStable();
    expect(tip.classList).toContain('open');

    host.dispatchEvent(new MouseEvent('mouseleave'));
    trigger.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(tip.classList).toContain('open');

    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(tip.classList).not.toContain('open');
  });
});
