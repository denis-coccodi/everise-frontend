import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { User } from '@everise/core/api-types';
import { ButtonComponent, IconComponent } from '@everise/ui/components';
import { filter } from 'rxjs';
import { AccountNavComponent } from '../account-nav/account-nav.component';
import { NavGroupComponent } from '../nav-group/nav-group.component';
import { NAV_GROUPS } from '../nav-group/nav-groups';
import { NotificationsComponent } from '../notifications/notifications.component';

// The site's top bar. On a phone (under 768 px) the links fold into a panel
// behind a Menu button (the disclosure pattern): it closes on going to a
// page, on Escape (the focus goes back to the button) and on a click outside.
@Component({
  selector: 'cdt-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  imports: [
    RouterModule,
    IconComponent,
    ButtonComponent,
    AccountNavComponent,
    NavGroupComponent,
    NotificationsComponent,
  ],
  host: {
    '(document:click)': 'closeOutside($event)',
    '(keydown.escape)': 'closeAndFocus()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly user = input.required<User>();
  readonly isLoggedIn = input.required<boolean>();
  // "Sign out" in the account menu.
  readonly logout = output<void>();

  // The pages after Home, by group.
  protected readonly groups = NAV_GROUPS;

  protected readonly open = signal(false);
  // The phone panel's account links, folded each time the panel opens.
  private readonly phoneAccount = viewChild<AccountNavComponent>('phoneAccount');
  private readonly toggle = viewChild.required<ElementRef<HTMLButtonElement>>('toggle');
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.open.set(false));
  }

  // Every time the panel opens, the account links start folded.
  protected toggleMenu() {
    if (!this.open()) this.phoneAccount()?.fold();
    this.open.set(!this.open());
  }

  protected closeOutside(event: Event) {
    if (this.open() && !this.host.contains(event.target as Node)) this.open.set(false);
  }

  protected closeAndFocus() {
    if (!this.open()) return;
    this.open.set(false);
    this.toggle().nativeElement.focus();
  }
}
