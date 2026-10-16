import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input } from '@angular/core';
import { FORM_FIELD } from '@angular/forms/signals';

export type InputSize = 'sm' | 'md' | 'lg';

// A themed text field on a native <input>, <textarea> or <select>, so forms,
// validation and accessibility work as usual: <input cdtInput="lg" ...>. An
// empty cdtInput is the medium size. A component (allowed on these elements)
// so its styles live here; its template only passes the content through, so
// a <select>'s <option>s stay in it. Bound to a signal form's field
// ([formField]), it sets aria-invalid once the person has been in an invalid
// field, so screen readers announce it and it gets the danger outline.
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

  private readonly field = inject(FORM_FIELD, { self: true, optional: true });
  private readonly element =
    inject<ElementRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>(ElementRef).nativeElement;

  // The field's value now.
  get value(): string {
    return this.element.value;
  }

  protected readonly invalid = computed(() => {
    const state = this.field?.state();
    return !!state && state.invalid() && (state.touched() || state.dirty());
  });
}
