import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

// One form field and its errors, spaced from the next:
// <cdt-field required><input cdtInput ...><cdt-input-errors ...></cdt-field>.
// `required` marks the field with an asterisk.
@Component({
  selector: 'cdt-field',
  template: '<ng-content />',
  styleUrl: './field.component.scss',
  host: { '[class.required]': 'required()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldComponent {
  readonly required = input(false, { transform: booleanAttribute });
}
