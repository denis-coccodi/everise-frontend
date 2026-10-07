import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ICON_NAMES, IconComponent, IconName } from './icon.component';

@Component({
  imports: [IconComponent],
  template: `<cdt-icon [name]="name()" />`,
})
class HostComponent {
  readonly name = signal<IconName>('menu');
}

describe('IconComponent', () => {
  it('draws the named icon as inline SVG, hidden from screen readers', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const icon = (fixture.nativeElement as HTMLElement).querySelector('cdt-icon') as HTMLElement;

    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('data-icon')).toBe('menu');
    expect(icon.querySelector('svg')?.getAttribute('focusable')).toBe('false');
    const menu = icon.querySelector('path')?.getAttribute('d');

    fixture.componentInstance.name.set('close');
    await fixture.whenStable();
    expect(icon.getAttribute('data-icon')).toBe('close');
    expect(icon.querySelector('path')?.getAttribute('d')).not.toBe(menu);
  });

  it.each<IconName>([...ICON_NAMES])('has a drawing for "%s"', async (name) => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.name.set(name);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('cdt-icon svg > *').length).toBeGreaterThan(0);
  });
});
