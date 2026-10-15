import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { User } from '@everise/core/api-types';
import { AvatarComponent, IconComponent, MenuComponent, MenuItemComponent } from '@everise/ui/components';

// The signed-in member's own pages and signing out. In the bar (from md up),
// a menu behind their picture and name (the name from lg up: the picture
// alone leaves the pages room on tablets); in the phone's panel, the same
// links folded under their name (a disclosure the navbar folds each time
// the panel opens).
@Component({
  selector: 'cdt-account-nav',
  templateUrl: './account-nav.component.html',
  styleUrl: './account-nav.component.scss',
  imports: [RouterLink, RouterLinkActive, AvatarComponent, IconComponent, MenuComponent, MenuItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNavComponent {
  readonly user = input.required<User>();
  readonly variant = input<'menu' | 'list'>('menu');
  // "Sign out".
  readonly logout = output<void>();

  // The phone panel's links, folded until the name is pressed.
  protected readonly unfolded = signal(false);

  fold() {
    this.unfolded.set(false);
  }
}
