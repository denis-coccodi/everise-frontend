import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

let nextDialogId = 0;

// A modal FFXIV window over a dimmed page:
// <cdt-dialog heading="Duty Found" (dismissed)="close()">...</cdt-dialog>.
// Clicking the backdrop or pressing Escape inside it emits `dismissed`; the
// parent decides whether to close. Move focus into the content when it opens.
@Component({
  selector: 'cdt-dialog',
  template: `
    <div class="backdrop" (click)="dismissed.emit()"></div>
    <section
      class="window"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="headingId"
      (keydown.escape)="dismissed.emit()"
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
}
