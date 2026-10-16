import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, email, form, minLength, required } from '@angular/forms/signals';
import { InputErrorsComponent } from './input-errors.component';

@Component({
  imports: [InputErrorsComponent, FormField],
  template: `
    <input id="email" [formField]="form.email" />
    <cdt-input-errors [field]="form.email" />
    <input id="password" [formField]="form.password" />
    <cdt-input-errors [field]="form.password" />
  `,
})
class HostComponent {
  readonly form = form(signal({ email: '', password: '' }), (path) => {
    required(path.email);
    email(path.email);
    minLength(path.password, 8);
  });
}

describe('InputErrorsComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const type = (id: string, value: string) => {
      const input = page.querySelector(`#${id}`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const messages = () => [...page.querySelectorAll('[data-testid="error"]')].map((li) => li.textContent?.trim());
    return { type, messages };
  }

  it('says nothing until the person has changed a field', () => {
    const { messages } = setup();

    expect(messages()).toEqual([]);
  });

  it("says in our words what's wrong, and goes once it's right", () => {
    const { type, messages } = setup();

    type('email', 'tataru');
    type('password', 'gil');
    expect(messages()).toEqual(['Enter a valid email address, like name@example.com.', 'Use at least 8 characters.']);

    type('email', '');
    expect(messages()).toEqual(['Fill in this field.', 'Use at least 8 characters.']);

    type('email', 'tataru@everise.dev');
    type('password', 'gil-for-the-scions');
    expect(messages()).toEqual([]);
  });
});
