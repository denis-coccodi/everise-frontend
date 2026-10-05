import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

// One form field, its label and its errors, spaced from the next:
// <cdt-field label="Email" for="email" required><input id="email" cdtInput ...>
// <cdt-input-errors ...></cdt-field>. `for` is the field's id. The label stays
// visible above the field (a placeholder alone disappears while typing);
// `hideLabel` keeps it for screen readers only, where the context already
// says what the field is for. `required` marks the field with an asterisk.
@Component({
  selector: 'cdt-field',
  template: `
    @if (label()) {
      <label class="label" [class.visually-hidden]="hideLabel()" [attr.for]="for() || null"
        >{{ label() }}
        @if (required()) {
          <span class="mark" aria-hidden="true">*</span><span class="visually-hidden"> (required)</span>
        }
      </label>
    }
    <ng-content />
  `,
  styleUrl: './field.component.scss',
  host: { '[class.required]': 'required()', '[class.labelled]': '!!label() && !hideLabel()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldComponent {
  readonly label = input('');
  readonly for = input('');
  readonly hideLabel = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
}
