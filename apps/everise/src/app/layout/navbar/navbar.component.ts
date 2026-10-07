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
import { User } from '@realworld/core/api-types';
import { AvatarComponent, IconComponent, MenuComponent, MenuItemComponent } from '@realworld/ui/components';
import { filter } from 'rxjs';

// The site's top bar. On a phone (under 768 px) the links fold into a panel
// behind a Menu button (the disclosure pattern): it closes on going to a
// page, on Escape (the focus goes back to the button) and on a click outside.
@Component({
  selector: 'cdt-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  imports: [RouterModule, IconComponent, MenuComponent, MenuItemComponent, AvatarComponent],
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

  protected readonly open = signal(false);
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

  protected closeOutside(event: Event) {
    if (this.open() && !this.host.contains(event.target as Node)) this.open.set(false);
  }

  protected closeAndFocus() {
    if (!this.open()) return;
    this.open.set(false);
    this.toggle().nativeElement.focus();
  }
}
