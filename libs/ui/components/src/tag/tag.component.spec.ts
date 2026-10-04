import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TagComponent } from './tag.component';

@Component({
  imports: [TagComponent],
  template: `
    <a id="filled" cdtTag>raids</a>
    <span id="outline" cdtTag="outline">savage</span>
  `,
})
class HostComponent {}

describe('TagComponent', () => {
  it('marks the filled or outlined look on the native element', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`#${id}`) as HTMLElement;

    expect(el('filled').dataset['variant']).toBe('filled');
    expect(el('filled').textContent).toBe('raids');
    expect(el('outline').dataset['variant']).toBe('outline');
  });
});
