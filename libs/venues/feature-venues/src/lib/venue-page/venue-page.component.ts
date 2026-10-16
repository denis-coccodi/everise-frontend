import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { DiscordSharingService } from '@everise/articles/data-access';
import { AuthStore } from '@everise/auth/data-access';
import {
  VenuePageStore,
  VenueShareStore,
  hoursText,
  isOpen,
  openingText,
  repeatText,
  textParts,
  venuesQuery,
} from '@everise/venues/data-access';
import { ButtonComponent, IconComponent, MessageComponent, TagComponent } from '@everise/ui/components';
import { VenueEventsComponent } from '../venue-events/venue-events.component';
import { VenueShareDialogComponent } from '../venue-share-dialog/venue-share-dialog.component';

// One venue's own page (/venues/<id>), which venue cards and links shared in
// the Everise Discord open: the venue as FFXIV Venues lists it (the whole
// description, its regular openings in the visitor's time, its links), and
// for members a way to share it in the Discord. A venue the site doesn't
// list gets the backend's words and a way back to the venues. Open to
// everyone, kept out of search engines: FFXIV Venues is the venue's home.
@Component({
  selector: 'cdt-venue-page',
  templateUrl: './venue-page.component.html',
  styleUrl: './venue-page.component.scss',
  imports: [
    ButtonComponent,
    IconComponent,
    MessageComponent,
    RouterLink,
    TagComponent,
    VenueEventsComponent,
    VenueShareDialogComponent,
  ],
  providers: [VenuePageStore, VenueShareStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenuePageComponent {
  protected readonly store = inject(VenuePageStore);
  protected readonly share = inject(VenueShareStore);
  protected readonly signedIn = inject(AuthStore).loggedIn;
  protected readonly discordAvailable = inject(DiscordSharingService).available;

  protected readonly opening = computed(() => {
    const next = this.store.venue()?.nextOpening;
    return next ? { text: openingText(next, this.store.now()), open: isOpen(next, this.store.now()) } : null;
  });
  protected readonly schedule = computed(() =>
    (this.store.venue()?.schedule ?? []).map((opening) => ({
      key: `${opening.opensAt}-${opening.closesAt}`,
      repeat: repeatText(opening),
      hours: hoursText(opening),
    })),
  );
  // The owners' paragraphs, their web addresses as links.
  protected readonly paragraphs = computed(() => (this.store.venue()?.description ?? []).map(textParts));
  // Back to the venues of the venue's data centre.
  protected readonly back = computed(() => {
    const dataCentre = this.store.venue()?.dataCentre;
    return dataCentre ? { label: `Venues on ${dataCentre}`, query: venuesQuery(dataCentre) } : null;
  });
  // A banner that fails to load leaves no broken picture behind.
  protected readonly bannerFailed = signal(false);

  constructor() {
    // The tab names the venue once it's known.
    const title = inject(Title);
    effect(() => {
      const venue = this.store.venue();
      if (venue) title.setTitle(`${venue.name} · Venues · Everise`);
    });
    const meta = inject(Meta);
    meta.updateTag({ name: 'robots', content: 'noindex' });
    inject(DestroyRef).onDestroy(() => meta.removeTag("name='robots'"));
  }
}
