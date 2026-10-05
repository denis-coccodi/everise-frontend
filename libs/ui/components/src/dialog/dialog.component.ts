import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

let nextDialogId = 0;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// A modal FFXIV window over a dimmed page:
// <cdt-dialog heading="Duty Found" (dismissed)="close()">...</cdt-dialog>.
// Clicking the backdrop or pressing Escape inside it emits `dismissed`; the
// parent decides whether to close. Move focus into the content when it opens;
// if nothing does, the window itself takes it. Tab and Shift+Tab stay inside
// the window, and closing it puts the focus back where it was before.
@Component({
  selector: 'cdt-dialog',
  template: `
    <div class="backdrop" (click)="dismissed.emit()"></div>
    <section
      #window
      class="window"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      [attr.aria-labelledby]="headingId"
      (keydown.escape)="dismissed.emit()"
      (keydown.tab)="keepFocusInside($event)"
      (keydown.shift.tab)="keepFocusInside($event)"
    >
      <h2 class="title-bar" [id]="headingId">{{ heading() }}</h2>
      <ng-content />
    </section>
  `,
  styleUrl: './dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent {
  readonly heading = input.required<string>();
  readonly dismissed = output<void>();

  protected readonly headingId = `cdt-dialog-${nextDialogId++}`;

  private readonly window = viewChild.required<ElementRef<HTMLElement>>('window');

  constructor() {
    const host = inject(ElementRef).nativeElement as HTMLElement;
    const opener = typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null);

    afterNextRender(() => {
      const window = this.window().nativeElement;
      if (!window.contains(document.activeElement)) {
        window.focus();
      }
    });

    // Back to the opener, unless the parent has already moved the focus.
    inject(DestroyRef).onDestroy(() => {
      const active = document.activeElement;
      if (opener?.isConnected && (!active || active === document.body || host.contains(active))) {
        opener.focus();
      }
    });
  }

  protected keepFocusInside(event: Event) {
    const window = this.window().nativeElement;
    const focusable = [...window.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest('[hidden]'));
    const first = focusable[0] ?? window;
    const last = focusable[focusable.length - 1] ?? window;
    const backwards = (event as KeyboardEvent).shiftKey;
    if (backwards && (document.activeElement === first || document.activeElement === window)) {
      event.preventDefault();
      last.focus();
    } else if (!backwards && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
