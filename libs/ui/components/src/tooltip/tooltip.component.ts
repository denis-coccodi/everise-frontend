import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

let nextId = 0;

// A short note shown above its content on hover or keyboard focus:
// <cdt-tooltip text="Accepts: PLD, WAR">…</cdt-tooltip>. It follows WCAG
// 1.4.13: it stays while the pointer is over it or its content, and Escape
// hides it. Screen readers get the text as the content's description.
// `focusable` makes the content a tab stop (for content that isn't one
// already); `tabIndex` lets a parent manage which one is (a roving tab stop).
@Component({
  selector: 'cdt-tooltip',
  template: `
    <span
      class="trigger"
      [attr.tabindex]="focusable() ? tabIndex() : null"
      [attr.aria-describedby]="id"
      (focus)="open.set(true)"
      (blur)="open.set(false)"
    >
      <ng-content />
    </span>
    <span class="tip" role="tooltip" [id]="id" [class.open]="open()">{{ text() }}</span>
  `,
  styleUrl: './tooltip.component.scss',
  host: {
    '(mouseenter)': 'open.set(true)',
    '(mouseleave)': 'open.set(false)',
    '(keydown.escape)': 'open.set(false)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipComponent {
  readonly text = input.required<string>();
  readonly focusable = input(false);
  readonly tabIndex = input(0);

  readonly open = signal(false);
  protected readonly id = `cdt-tooltip-${nextId++}`;
}
