import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PanelComponent } from './panel.component';

@Component({
  imports: [PanelComponent],
  template: `
    <cdt-panel id="titled" heading="Settings"><p>Body</p></cdt-panel>
    <cdt-panel id="labelled" label="Roulette"><p>Body</p></cdt-panel>
    <cdt-panel id="plain"><p>Body</p></cdt-panel>
  `,
})
class HostComponent {}

describe('PanelComponent', () => {
  it('shows a title bar only with a heading, and names the window for screen readers', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = (selector: string) => (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement;

    expect(el('#titled h2')?.textContent?.trim()).toBe('Settings');
    expect(el('#titled').getAttribute('role')).toBe('region');
    expect(el('#titled').getAttribute('aria-label')).toBe('Settings');
    // No native tooltip from the heading.
    expect(el('#titled').hasAttribute('title')).toBe(false);

    expect(el('#labelled h2')).toBeNull();
    expect(el('#labelled').getAttribute('aria-label')).toBe('Roulette');

    expect(el('#plain h2')).toBeNull();
    expect(el('#plain').hasAttribute('role')).toBe(false);
    expect(el('#plain p')?.textContent).toBe('Body');
  });
});
