import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputComponent } from './input.component';

@Component({
  imports: [InputComponent, ReactiveFormsModule],
  template: `
    <input id="field" cdtInput="lg" [formControl]="name" />
    <textarea id="area" cdtInput></textarea>
    <select id="choice" cdtInput="sm">
      <option value="user">User</option>
      <option value="staging-tester" selected>Staging tester</option>
    </select>
  `,
})
class HostComponent {
  readonly name = new FormControl("Y'shtola", Validators.required);
}

describe('InputComponent', () => {
  it('marks the size on the native field and leaves it working with forms', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const field = (fixture.nativeElement as HTMLElement).querySelector('#field') as HTMLInputElement;
    const area = (fixture.nativeElement as HTMLElement).querySelector('#area') as HTMLTextAreaElement;

    expect(field.dataset['size']).toBe('lg');
    expect(area.dataset['size']).toBe('md');
    expect(field.value).toBe("Y'shtola");
    expect(field.childNodes.length).toBe(0);

    field.value = 'Alphinaud';
    field.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.name.value).toBe('Alphinaud');
  });

  it('marks an invalid field for screen readers once the person has been in it', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const field = (fixture.nativeElement as HTMLElement).querySelector('#field') as HTMLInputElement;
    const area = (fixture.nativeElement as HTMLElement).querySelector('#area') as HTMLTextAreaElement;

    expect(field.getAttribute('aria-invalid')).toBeNull();

    field.value = '';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(field.getAttribute('aria-invalid')).toBe('true');

    field.value = 'Urianger';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(field.getAttribute('aria-invalid')).toBeNull();
    // Outside a form there is nothing to check.
    expect(area.getAttribute('aria-invalid')).toBeNull();
  });

  it('keeps the options of a select', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const select = (fixture.nativeElement as HTMLElement).querySelector('#choice') as HTMLSelectElement;

    expect([...select.options].map((o) => o.value)).toEqual(['user', 'staging-tester']);
    expect(select.value).toBe('staging-tester');
    expect(select.dataset['size']).toBe('sm');
  });
});
