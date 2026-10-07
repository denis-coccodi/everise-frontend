import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

// An on/off switch for a setting that takes effect at once:
// <cdt-switch [(checked)]="dark" onIcon="moon" offIcon="sun">Dark mode</cdt-switch>.
// A native button with the switch role, so Enter and Space flip it, screen
// readers say "switch, on/off" with the projected label as its name, and a
// disabled <fieldset> around it disables it. The knob slides across and, with
// icons, shows which side is on by its picture as well as its colour.
@Component({
  selector: 'cdt-switch',
  imports: [IconComponent],
  template: `
    <button type="button" role="switch" [attr.aria-checked]="checked()" (click)="checked.set(!checked())">
      <span class="label"><ng-content /></span>
      <span class="track" aria-hidden="true">
        <span class="knob">
          @if (checked() ? onIcon() : offIcon(); as icon) {
            <cdt-icon [name]="icon" />
          }
        </span>
      </span>
    </button>
  `,
  styleUrl: './switch.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchComponent {
  readonly checked = model(false);
  // Drawn in the knob while on / off.
  readonly onIcon = input<IconName>();
  readonly offIcon = input<IconName>();
}
