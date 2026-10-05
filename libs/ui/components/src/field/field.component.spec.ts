import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldComponent } from './field.component';

@Component({
  imports: [FieldComponent],
  template: `
    <cdt-field id="required" required><input /></cdt-field>
    <cdt-field id="optional"><input /></cdt-field>
    <cdt-field id="labelled" label="Email" for="email" required><input id="email" /></cdt-field>
    <cdt-field id="hidden" label="Comment" for="comment" hideLabel><textarea id="comment"></textarea></cdt-field>
  `,
})
class HostComponent {}

describe('FieldComponent', () => {
  async function render() {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    return (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`#${id}`) as HTMLElement;
  }

  it('wraps a field and marks required ones', async () => {
    const el = await render();

    expect(el('required').classList).toContain('required');
    expect(el('optional').classList).not.toContain('required');
    expect(el('optional').querySelector('input')).not.toBeNull();
    expect(el('optional').querySelector('label')).toBeNull();
  });

  it('labels the field, saying it is required, or only for screen readers when asked', async () => {
    const el = await render();

    const label = el('labelled').querySelector('label') as HTMLLabelElement;
    expect(label.htmlFor).toBe('email');
    expect(label.textContent?.replace(/\s+/g, ' ').trim()).toBe('Email * (required)');
    expect((el('email') as HTMLInputElement).labels?.[0]).toBe(label);
    expect(label.classList).not.toContain('visually-hidden');

    const hidden = el('hidden').querySelector('label') as HTMLLabelElement;
    expect(hidden.classList).toContain('visually-hidden');
    expect((el('comment') as HTMLTextAreaElement).labels?.[0]).toBe(hidden);
  });
});
