import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';

export type InputSize = 'sm' | 'md' | 'lg';

// A themed text field on a native <input>, <textarea> or <select>, so forms,
// validation and accessibility work as usual: <input cdtInput="lg" ...>. An
// empty cdtInput is the medium size. A component (allowed on these elements)
// so its styles live here; its template only passes the content through, so
// a <select>'s <option>s stay in it. In a reactive or template-driven
// form, it sets aria-invalid once the person has been in an invalid field, so
// screen readers announce it and it gets the danger outline.
// Outside a form, a template reads what was typed through it, typed:
// <input cdtInput #name="cdtInput" (input)="set(name.value)">.
@Component({
  selector: 'input[cdtInput], textarea[cdtInput], select[cdtInput]',
  exportAs: 'cdtInput',
  template: '<ng-content />',
  styleUrl: './input.component.scss',
  host: {
    '[attr.data-size]': "cdtInput() || 'md'",
    '[attr.aria-invalid]': 'invalid() || null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent {
  readonly cdtInput = input<InputSize | ''>('');

  private readonly control = inject(NgControl, { self: true, optional: true });
  private readonly element =
    inject<ElementRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>(ElementRef).nativeElement;

  // The field's value now.
  get value(): string {
    return this.element.value;
  }

  protected invalid() {
    const control = this.control;
    return !!control && !!control.invalid && !!(control.touched || control.dirty);
  }
}
