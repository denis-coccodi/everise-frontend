import { Directive, input } from '@angular/core';

export type InputSize = 'sm' | 'md' | 'lg';

// A themed text field on a native <input>, <textarea> or <select>, so forms,
// validation and accessibility work as usual: <input cdtInput="lg" ...>. An
// empty cdtInput is the medium size. The look lives in theme/_controls.scss.
@Directive({
  selector: 'input[cdtInput], textarea[cdtInput], select[cdtInput]',
  host: {
    class: 'form-control',
    '[class.form-control-sm]': "cdtInput() === 'sm'",
    '[class.form-control-lg]': "cdtInput() === 'lg'",
  },
})
export class InputDirective {
  readonly cdtInput = input<InputSize | ''>('');
}
