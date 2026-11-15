import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// A bar that fills as long work goes on: <cdt-progress [value]="0.4"
// label="Planning" />, `value` from 0 to 1. A progress bar for screen
// readers (role="progressbar"), named by `label`, with its percentage.
@Component({
  selector: 'cdt-progress',
  template: '<span class="fill" [style.width.%]="percent()"></span>',
  styleUrl: './progress.component.scss',
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'percent()',
    '[attr.aria-label]': 'label()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressComponent {
  readonly value = input.required<number>();
  readonly label = input.required<string>();
  protected readonly percent = computed(() => Math.round(Math.min(1, Math.max(0, this.value() || 0)) * 100));
}
