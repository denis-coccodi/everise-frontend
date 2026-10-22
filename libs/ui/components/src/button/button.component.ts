import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ButtonVariant, ButtonSize } from './button.model';

// A themed button or button-styled link on the native element:
// <button cdtButton="outline-danger" size="sm">. An empty cdtButton is a
// primary button. A component (not a directive) so its styles live here.
@Component({
  selector: 'button[cdtButton], a[cdtButton]',
  template: '<ng-content />',
  styleUrl: './button.component.scss',
  host: {
    '[attr.data-variant]': 'variant()',
    // The call to action and chips have one size.
    '[attr.data-size]': "variant() === 'cta' || variant() === 'chip' ? null : size()",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  readonly cdtButton = input<ButtonVariant | ''>('');
  readonly size = input<ButtonSize>('md');

  protected readonly variant = computed(() => this.cdtButton() || 'primary');
}
