import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type InputSize = 'sm' | 'md' | 'lg';

// A themed text field on a native <input>, <textarea> or <select>, so forms,
// validation and accessibility work as usual: <input cdtInput="lg" ...>. An
// empty cdtInput is the medium size. A component with no template (allowed on
// these elements) so its styles live here.
@Component({
  selector: 'input[cdtInput], textarea[cdtInput], select[cdtInput]',
  template: '',
  styleUrl: './input.component.scss',
  host: { '[attr.data-size]': "cdtInput() || 'md'" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent {
  readonly cdtInput = input<InputSize | ''>('');
}
