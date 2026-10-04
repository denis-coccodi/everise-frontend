import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonDirective, ButtonVariant } from './button/button.directive';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { DialogComponent } from './dialog/dialog.component';
import { InputDirective } from './input/input.directive';
import { PanelComponent } from './panel/panel.component';
import { TabDirective, TabsDirective } from './tabs/tabs.directive';
import { TagDirective } from './tag/tag.directive';

@Component({
  imports: [
    ButtonDirective,
    InputDirective,
    CheckboxComponent,
    PanelComponent,
    TabsDirective,
    TabDirective,
    TagDirective,
    DialogComponent,
  ],
  template: `
    <button id="default" cdtButton>Go</button>
    <button id="variant" [cdtButton]="variant()" size="sm">Go</button>
    <a id="link" cdtButton="outline-secondary" size="lg">Edit</a>
    <input id="field" cdtInput="lg" />
    <textarea id="area" cdtInput></textarea>
    <cdt-checkbox [(checked)]="on">Dungeons</cdt-checkbox>
    <cdt-panel id="titled" heading="Settings"><p>Body</p></cdt-panel>
    <cdt-panel id="plain"><p>Body</p></cdt-panel>
    <ul id="tabs" cdtTabs>
      <li><a id="tab-on" cdtTab [active]="true">One</a></li>
      <li><a id="tab-off" cdtTab>Two</a></li>
    </ul>
    <a id="tag" cdtTag>raids</a>
    <span id="tag-outline" cdtTag="outline">savage</span>
    <cdt-dialog heading="Duty Found" (dismissed)="dismissals = dismissals + 1"
      ><button id="inside">OK</button></cdt-dialog
    >
  `,
})
class HostComponent {
  readonly variant = signal<ButtonVariant>('outline-danger');
  readonly on = signal(false);
  dismissals = 0;
}

describe('UI components', () => {
  let fixture: ComponentFixture<HostComponent>;
  const el = (selector: string) => (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement;
  const classes = (selector: string) => [...el(selector).classList].sort();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  it('cdtButton applies the theme button classes for its variant and size', async () => {
    expect(classes('#default')).toEqual(['btn', 'btn-primary']);
    expect(classes('#variant')).toEqual(['btn', 'btn-outline-danger', 'btn-sm']);
    expect(classes('#link')).toEqual(['btn', 'btn-lg', 'btn-outline-secondary']);

    fixture.componentInstance.variant.set('cta');
    await fixture.whenStable();
    // The call to action has its own look, without .btn or sizes.
    expect(classes('#variant')).toEqual(['xiv-cta']);
  });

  it('cdtInput applies the theme field classes for its size', () => {
    expect(classes('#field')).toEqual(['form-control', 'form-control-lg']);
    expect(classes('#area')).toEqual(['form-control']);
  });

  it('cdt-checkbox is a labelled checkbox with two-way checked', async () => {
    const box = el('cdt-checkbox input') as HTMLInputElement;
    expect(el('cdt-checkbox label').textContent?.trim()).toBe('Dungeons');
    expect(box.checked).toBe(false);

    box.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.on()).toBe(true);

    fixture.componentInstance.on.set(false);
    await fixture.whenStable();
    expect(box.checked).toBe(false);
  });

  it('cdt-panel is a window, with a title bar only when it has a heading', () => {
    expect(el('#titled').classList).toContain('xiv-panel');
    expect(el('#titled .xiv-title-bar').textContent?.trim()).toBe('Settings');
    expect(el('#titled').getAttribute('aria-label')).toBe('Settings');
    // No native tooltip from the heading.
    expect(el('#titled').hasAttribute('title')).toBe(false);
    expect(el('#plain .xiv-title-bar')).toBeNull();
  });

  it('cdtTabs and cdtTab apply the theme tab classes and mark the active tab', () => {
    expect(classes('#tabs')).toEqual(['nav', 'nav-pills', 'outline-active']);
    expect(classes('#tab-on')).toEqual(['active', 'nav-link']);
    expect(el('#tab-on').getAttribute('aria-current')).toBe('page');
    expect(classes('#tab-off')).toEqual(['nav-link']);
  });

  it('cdtTag applies the theme tag classes, outlined on request', () => {
    expect(classes('#tag')).toEqual(['tag-default', 'tag-pill']);
    expect(classes('#tag-outline')).toEqual(['tag-default', 'tag-outline', 'tag-pill']);
  });

  it('cdt-dialog is a labelled modal window that asks to close on backdrop click and Escape', () => {
    const dialog = el('cdt-dialog [role=dialog]');
    const heading = el('cdt-dialog .xiv-title-bar');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.textContent?.trim()).toBe('Duty Found');

    el('cdt-dialog .xiv-backdrop').click();
    el('#inside').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fixture.componentInstance.dismissals).toBe(2);
  });
});
