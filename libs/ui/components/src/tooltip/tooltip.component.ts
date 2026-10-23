import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

let nextId = 0;
// The least room a tooltip leaves to the viewport's edges.
const EDGE_PX = 8;

// A short note shown above its content on hover or keyboard focus:
// <cdt-tooltip text="Accepts: PLD, WAR">…</cdt-tooltip>. It follows WCAG
// 1.4.13: it stays while the pointer is over it or its content, and Escape
// hides it. Screen readers get the text as the content's description.
// `focusable` makes the content a tab stop (for content that isn't one
// already); `tabIndex` lets a parent manage which one is (a roving tab stop).
// Line breaks in the text stay. Centred on its content, it moves sideways
// as it opens where it would leave the viewport.
@Component({
  selector: 'cdt-tooltip',
  template: `
    <span
      class="trigger"
      [attr.tabindex]="focusable() ? tabIndex() : null"
      [attr.aria-describedby]="id"
      (focus)="show()"
      (blur)="open.set(false)"
    >
      <ng-content />
    </span>
    <span #tip class="tip" role="tooltip" [id]="id" [class.open]="open()" [style.margin-left.px]="shift()">{{
      text()
    }}</span>
  `,
  styleUrl: './tooltip.component.scss',
  host: {
    '(mouseenter)': 'show()',
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
  // How far it moves sideways to stay in the viewport.
  protected readonly shift = signal(0);
  private readonly tip = viewChild.required<ElementRef<HTMLElement>>('tip');
  private readonly injector = inject(Injector);

  protected show() {
    this.shift.set(0);
    this.open.set(true);
    afterNextRender(
      () => {
        const { left, right } = this.tip().nativeElement.getBoundingClientRect();
        const width = document.documentElement.clientWidth;
        if (right > width - EDGE_PX) this.shift.set(Math.max(EDGE_PX - left, width - EDGE_PX - right));
        else if (left < EDGE_PX) this.shift.set(EDGE_PX - left);
      },
      { injector: this.injector },
    );
  }
}
