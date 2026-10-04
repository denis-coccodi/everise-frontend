import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldComponent } from './field.component';

@Component({
  imports: [FieldComponent],
  template: `
    <cdt-field id="required" required><input /></cdt-field>
    <cdt-field id="optional"><input /></cdt-field>
  `,
})
class HostComponent {}

describe('FieldComponent', () => {
  it('wraps a field and marks required ones', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`#${id}`) as HTMLElement;

    expect(el('required').classList).toContain('required');
    expect(el('optional').classList).not.toContain('required');
    expect(el('optional').querySelector('input')).not.toBeNull();
  });
});
