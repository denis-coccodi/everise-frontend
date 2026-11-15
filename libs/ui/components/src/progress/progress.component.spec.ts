import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProgressComponent } from './progress.component';

@Component({
  imports: [ProgressComponent],
  template: `<cdt-progress [value]="value()" label="Planning" />`,
})
class HostComponent {
  readonly value = signal(0.424);
}

describe('ProgressComponent', () => {
  it('is a named progress bar, filled to its share, kept within 0 to 100%', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const bar = (fixture.nativeElement as HTMLElement).querySelector('cdt-progress') as HTMLElement;
    const fill = bar.querySelector('.fill') as HTMLElement;

    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-label')).toBe('Planning');
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect(fill.style.width).toBe('42%');

    fixture.componentInstance.value.set(1.5);
    await fixture.whenStable();
    expect(bar.getAttribute('aria-valuenow')).toBe('100');

    fixture.componentInstance.value.set(-1);
    await fixture.whenStable();
    expect(fill.style.width).toBe('0%');
  });
});
