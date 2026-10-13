import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { TooltipComponent } from '../tooltip/tooltip.component';

// One form field, its label and its errors, spaced from the next:
// <cdt-field label="Email" for="email" required><input id="email" cdtInput ...>
// <cdt-input-errors ...></cdt-field>. `for` is the field's id. The label stays
// visible above the field (a placeholder alone disappears while typing);
// `hideLabel` keeps it for screen readers only, where the context already
// says what the field is for. `required` marks the field with an asterisk.
// `hint` is extra detail, in a tooltip on an info icon beside the label
// (outside it: a label holds no other control), so fields side by side
// keep the same height.
@Component({
  selector: 'cdt-field',
  imports: [IconComponent, TooltipComponent],
  template: `
    @if (label()) {
      <div class="head">
        <label class="label" [class.visually-hidden]="hideLabel()" [attr.for]="for() || null"
          >{{ label() }}
          @if (required()) {
            <span class="mark" aria-hidden="true">*</span><span class="visually-hidden"> (required)</span>
          }
        </label>
        @if (hint()) {
          <cdt-tooltip class="hint" [text]="hint()" [focusable]="true"
            ><cdt-icon name="info" /><span class="visually-hidden">About {{ label() }}</span></cdt-tooltip
          >
        }
      </div>
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
  readonly hint = input('');
}
