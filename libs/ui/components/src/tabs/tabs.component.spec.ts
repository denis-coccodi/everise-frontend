import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TabComponent } from './tab.component';
import { TabsComponent } from './tabs.component';

@Component({
  imports: [TabsComponent, TabComponent],
  template: `
    <ul id="tabs" cdtTabs>
      <li><a id="one" cdtTab [active]="selected() === 'one'">One</a></li>
      <li><a id="two" cdtTab [active]="selected() === 'two'">Two</a></li>
      <li><button id="three" type="button" cdtTab [active]="selected() === 'three'">Three</button></li>
    </ul>
  `,
})
class HostComponent {
  readonly selected = signal('one');
}

describe('TabsComponent and TabComponent', () => {
  it('mark the active tab for styles and screen readers', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`#${id}`) as HTMLElement;

    expect(el('tabs').getAttribute('role')).toBe('list');
    expect(el('one').classList).toContain('active');
    expect(el('one').getAttribute('aria-current')).toBe('page');
    expect(el('two').classList).not.toContain('active');

    fixture.componentInstance.selected.set('two');
    await fixture.whenStable();
    expect(el('one').classList).not.toContain('active');
    expect(el('two').getAttribute('aria-current')).toBe('page');

    // A button tab isn't a page of its own.
    fixture.componentInstance.selected.set('three');
    await fixture.whenStable();
    expect(el('three').classList).toContain('active');
    expect(el('three').getAttribute('aria-current')).toBe('true');
  });
});
