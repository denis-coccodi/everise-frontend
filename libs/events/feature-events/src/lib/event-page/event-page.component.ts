import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { DiscordSharingService } from '@everise/articles/data-access';
import { AuthStore } from '@everise/auth/data-access';
import {
  EventPageStore,
  EventShareStore,
  dayHeading,
  eventsQuery,
  hoursText,
  isLive,
  whenText,
} from '@everise/events/data-access';
import { RichTextComponent } from '@everise/media';
import {
  AvatarComponent,
  ButtonComponent,
  IconComponent,
  MessageComponent,
  TagComponent,
} from '@everise/ui/components';
import { EventShareDialogComponent } from '../event-share-dialog/event-share-dialog.component';

// One event's own page (/events/<id>), which event cards and links shared
// in the Everise Discord open: the event as Partake lists it (the
// organisers' description, when it is in the visitor's time, where, who
// hosts it), and for members a way to share it in the Discord until it
// ends. An event the site doesn't list gets the backend's words and a way
// back. Open to everyone, kept out of search engines: Partake is the
// event's home.
@Component({
  selector: 'cdt-event-page',
  templateUrl: './event-page.component.html',
  styleUrl: './event-page.component.scss',
  imports: [
    AvatarComponent,
    ButtonComponent,
    EventShareDialogComponent,
    IconComponent,
    MessageComponent,
    RichTextComponent,
    RouterLink,
    TagComponent,
  ],
  providers: [EventPageStore, EventShareStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventPageComponent {
  protected readonly store = inject(EventPageStore);
  protected readonly share = inject(EventShareStore);
  protected readonly signedIn = inject(AuthStore).loggedIn;
  protected readonly discordAvailable = inject(DiscordSharingService).available;

  protected readonly when = computed(() => {
    const event = this.store.event();
    if (!event) return null;
    const now = this.store.now();
    return {
      text: Date.parse(event.endsAt) <= now ? 'This event is over' : whenText(event, now),
      live: isLive(event, now),
      day: dayHeading(event.startsAt, now),
      hours: hoursText(event),
      over: Date.parse(event.endsAt) <= now,
    };
  });
  protected readonly where = computed(() => {
    const event = this.store.event();
    return event ? [event.world, event.location].filter(Boolean).join(', ') : '';
  });
  // Back to the events of the event's data centre.
  protected readonly back = computed(() => {
    const dataCentre = this.store.event()?.dataCentre;
    return dataCentre ? { label: `Events on ${dataCentre}`, query: eventsQuery(dataCentre) } : null;
  });
  // A banner that fails to load leaves no broken picture behind.
  protected readonly bannerFailed = signal(false);

  constructor() {
    // The tab names the event once it's known.
    const title = inject(Title);
    effect(() => {
      const event = this.store.event();
      if (event) title.setTitle(`${event.title} · Events · Everise`);
    });
    const meta = inject(Meta);
    meta.updateTag({ name: 'robots', content: 'noindex' });
    inject(DestroyRef).onDestroy(() => meta.removeTag("name='robots'"));
  }
}
