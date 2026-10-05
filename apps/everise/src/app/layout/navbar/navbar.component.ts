import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { User } from '@realworld/core/api-types';
import { MenuComponent, MenuItemComponent } from '@realworld/ui/components';

@Component({
  selector: 'cdt-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  imports: [RouterModule, MenuComponent, MenuItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly user = input.required<User>();
  readonly isLoggedIn = input.required<boolean>();
  // "Sign out" in the account menu.
  readonly logout = output<void>();
}
