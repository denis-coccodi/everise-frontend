import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// An entry in a <cdt-menu>, on a native link or button:
// <a cdtMenuItem routerLink="/settings">Settings</a>. `divided` draws a line
// above it, to set apart an item such as "Sign out".
@Component({
  selector: 'a[cdtMenuItem], button[cdtMenuItem]',
  template: '<ng-content />',
  styleUrl: './menu-item.component.scss',
  host: {
    role: 'menuitem',
    // Reached with the arrow keys, not Tab, like a native menu.
    tabindex: '-1',
    '[class.divided]': 'divided()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuItemComponent {
  readonly divided = input(false);
}
