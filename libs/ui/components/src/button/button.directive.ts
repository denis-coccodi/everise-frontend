import { Directive, computed, input } from '@angular/core';

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

// A themed button or button-styled link: <button cdtButton="outline-danger" size="sm">.
// An empty cdtButton is a primary button. The look lives in the theme
// (theme/_controls.scss and theme/_shared.scss).
@Directive({
  selector: 'button[cdtButton], a[cdtButton]',
  host: {
    '[class.btn]': '!special()',
    '[class.btn-primary]': "variant() === 'primary'",
    '[class.btn-secondary]': "variant() === 'secondary'",
    '[class.btn-outline-primary]': "variant() === 'outline-primary'",
    '[class.btn-outline-secondary]': "variant() === 'outline-secondary'",
    '[class.btn-outline-danger]': "variant() === 'outline-danger'",
    '[class.btn-sm]': "!special() && size() === 'sm'",
    '[class.btn-lg]': "!special() && size() === 'lg'",
    '[class.xiv-cta]': "variant() === 'cta'",
    '[class.xiv-chip]': "variant() === 'chip'",
  },
})
export class ButtonDirective {
  readonly cdtButton = input<ButtonVariant | ''>('');
  readonly size = input<ButtonSize>('md');

  protected readonly variant = computed(() => this.cdtButton() || 'primary');
  // Variants with their own complete look, not built on .btn.
  protected readonly special = computed(() => this.variant() === 'cta' || this.variant() === 'chip');
}
