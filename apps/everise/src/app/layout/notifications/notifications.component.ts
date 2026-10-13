import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Notification } from '@everise/core/api-types';
import {
  NotificationsStore,
  notificationAge,
  notificationLink,
  notificationParts,
} from '@everise/notifications/data-access';
import { AvatarComponent, ButtonComponent, IconComponent, MessageComponent } from '@everise/ui/components';
import { filter } from 'rxjs';

// What each kind shows on the picture: a heart, a speech bubble, a plus.
const KIND_ICONS = { favorite: 'heart', comment: 'chat', follow: 'plus' } as const;

// The header's bell, for signed-in members, as Facebook has it: a badge
// with how many are new, and a panel (a disclosure) listing them, newest
// first. Opening it makes them all seen; each stays highlighted until it's
// opened (or "Mark all as read"). Each names who did it and the post, linked
// to their profiles and the post. The panel closes on following a link, on
// Escape (the focus goes back to the bell) and on a click outside.
@Component({
  selector: 'cdt-notifications',
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
  imports: [RouterLink, AvatarComponent, ButtonComponent, IconComponent, MessageComponent],
  host: {
    '(document:click)': 'closeOutside($event)',
    '(keydown.escape)': 'closeAndFocus()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent {
  protected readonly store = inject(NotificationsStore);
  protected readonly open = signal(false);
  // The clock for "5 min", taken when the panel opens.
  protected readonly now = signal(Date.now());
  protected readonly hasUnread = computed(() => this.store.notifications().some((n) => !n.read));
  // The badge: a number up to 9, then "9+".
  protected readonly badge = computed(() => {
    const count = this.store.unseenCount();
    return count > 9 ? '9+' : String(count);
  });
  protected readonly kindIcons = KIND_ICONS;
  protected readonly partsOf = notificationParts;
  protected readonly linkOf = notificationLink;

  private readonly bell = viewChild.required<ElementRef<HTMLButtonElement>>('bell');
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.open.set(false));
  }

  protected toggle() {
    const opening = !this.open();
    this.open.set(opening);
    if (opening) {
      this.now.set(Date.now());
      this.store.open();
    }
  }

  protected ageOf(notification: Notification) {
    return notificationAge(notification.at, this.now());
  }

  // Following one of its links opens it.
  protected opened(notification: Notification) {
    if (!notification.read) this.store.markRead(notification.id);
    this.open.set(false);
  }

  protected closeAndFocus() {
    if (!this.open()) return;
    this.open.set(false);
    this.bell().nativeElement.focus();
  }

  protected closeOutside(event: Event) {
    if (this.open() && event.target instanceof Node && !this.host.contains(event.target)) this.open.set(false);
  }
}
