import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CheckboxComponent } from './checkbox.component';

@Component({
  imports: [CheckboxComponent],
  template: `<cdt-checkbox [(checked)]="on">Dungeons</cdt-checkbox>`,
})
class HostComponent {
  readonly on = signal(false);
}

describe('CheckboxComponent', () => {
  it('is a labelled checkbox with two-way checked', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const box = root.querySelector('input') as HTMLInputElement;

    expect(root.querySelector('label')?.textContent?.trim()).toBe('Dungeons');
    expect(box.checked).toBe(false);

    box.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.on()).toBe(true);

    fixture.componentInstance.on.set(false);
    await fixture.whenStable();
    expect(box.checked).toBe(false);
  });
});
