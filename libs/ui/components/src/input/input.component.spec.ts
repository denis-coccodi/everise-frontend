import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from './input.component';

@Component({
  imports: [InputComponent, ReactiveFormsModule],
  template: `
    <input id="field" cdtInput="lg" [formControl]="name" />
    <textarea id="area" cdtInput></textarea>
  `,
})
class HostComponent {
  readonly name = new FormControl("Y'shtola");
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
});
