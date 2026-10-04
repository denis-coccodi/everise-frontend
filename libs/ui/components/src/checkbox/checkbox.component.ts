import { ChangeDetectionStrategy, Component, model } from '@angular/core';

// A themed checkbox with its label: <cdt-checkbox [(checked)]="on">Dungeons</cdt-checkbox>.
// The projected content is the label; extra elements (a count badge) sit
// beside it in the row. A disabled <fieldset> around it disables it.
@Component({
  selector: 'cdt-checkbox',
  template: `
    <label class="row">
      <input type="checkbox" [checked]="checked()" (change)="checked.set($any($event.target).checked)" />
      <ng-content />
    </label>
  `,
  styleUrl: './checkbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxComponent {
  readonly checked = model(false);
}
