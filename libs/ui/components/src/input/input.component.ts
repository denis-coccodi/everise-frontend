import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';

export type InputSize = 'sm' | 'md' | 'lg';

// A themed text field on a native <input>, <textarea> or <select>, so forms,
// validation and accessibility work as usual: <input cdtInput="lg" ...>. An
// empty cdtInput is the medium size. A component with no template (allowed on
// these elements) so its styles live here. In a reactive or template-driven
// form, it sets aria-invalid once the person has been in an invalid field, so
// screen readers announce it and it gets the danger outline.
@Component({
  selector: 'input[cdtInput], textarea[cdtInput], select[cdtInput]',
  template: '',
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

  protected invalid() {
    const control = this.control;
    return !!control && !!control.invalid && !!(control.touched || control.dirty);
  }
}
