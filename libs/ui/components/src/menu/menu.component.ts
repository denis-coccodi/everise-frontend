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

// A button that opens a small menu of links and actions, such as the user
// menu in the header:
//
//   <cdt-menu label="Account">
//     <span cdtMenuTrigger>…name…</span>
//     <a cdtMenuItem routerLink="/settings">Settings</a>
//     <button cdtMenuItem type="button" (click)="…">Sign out</button>
//   </cdt-menu>
//
// Keyboard: Enter, Space or Down opens it on the first item, Up on the last;
// Up, Down, Home and End move between items; Escape closes it and returns to
// the button. Choosing an item, clicking outside or tabbing away closes it.
@Component({
  selector: 'cdt-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'closeAndFocusTrigger()',
    '(focusout)': 'onFocusOut($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent {
  // Names the menu for screen readers, e.g. "Account".
  readonly label = input.required<string>();

  readonly open = signal(false);
  protected readonly panelId = `cdt-menu-${nextId++}`;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  protected toggle() {
    if (this.open()) {
      this.open.set(false);
    } else {
      this.openOn('first');
    }
  }

  protected openOn(item: 'first' | 'last', event?: Event) {
    event?.preventDefault();
    this.open.set(true);
    afterNextRender(() => this.focusItem(item === 'first' ? 0 : -1), { injector: this.injector });
  }

  protected onPanelKeydown(event: KeyboardEvent) {
    const items = this.items();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const moves: Record<string, number> = {
      ArrowDown: current + 1,
      ArrowUp: current - 1,
      Home: 0,
      End: -1,
    };
    if (event.key in moves) {
      event.preventDefault();
      this.focusItem(moves[event.key]);
    }
  }

  // Choosing an item closes the menu.
  protected onPanelClick(event: Event) {
    if ((event.target as Element).closest('[role="menuitem"]')) {
      this.open.set(false);
    }
  }

  protected closeAndFocusTrigger() {
    if (this.open()) {
      this.open.set(false);
      this.trigger().nativeElement.focus();
    }
  }

  protected onDocumentClick(event: Event) {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  protected onFocusOut(event: FocusEvent) {
    const next = event.relatedTarget as Node | null;
    if (next && !this.host.nativeElement.contains(next)) {
      this.open.set(false);
    }
  }

  private items() {
    return [...this.panel().nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  }

  // Focuses an item by index, wrapping around; -1 is the last.
  private focusItem(index: number) {
    const items = this.items();
    if (items.length > 0) {
      items[(index + items.length) % items.length].focus();
    }
  }
}
