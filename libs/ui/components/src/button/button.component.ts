import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline-primary'
  | 'outline-secondary'
  | 'outline-danger'
  // The big call to action ("Commence").
  | 'cta'
  // A small pill button (All / None).
  | 'chip';

export type ButtonSize = 'sm' | 'md' | 'lg';

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
