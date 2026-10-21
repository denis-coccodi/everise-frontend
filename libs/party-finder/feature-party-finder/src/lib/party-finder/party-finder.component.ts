import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiscordSharingService } from '@everise/articles/data-access';
import { AuthStore } from '@everise/auth/data-access';
import { PartyFinderBoard, PartyFinderListing } from '@everise/core/api-types';
import { PartyFinderStore, PfShareStore, ShareWay, listingPage, listingTitle } from '@everise/party-finder/data-access';
import { ButtonComponent, IconComponent, MessageComponent, PagerComponent } from '@everise/ui/components';
import { PfDataCentresComponent } from '../pf-data-centres/pf-data-centres.component';
import { PfFiltersComponent } from '../pf-filters/pf-filters.component';
import { PfShareDialogComponent } from '../pf-share-dialog/pf-share-dialog.component';
import { PfListingComponent, ago } from '@everise/party-finder/feature-pf-listing';

// The Party Finder: the listings up on a data centre (the one in the query
// string, ?dc=chaos; else Light, Everise's, from Odin), as xivpf.com
// collects them from players' plugins,
// refreshed every 30 seconds while the page is in view (PartyFinderStore),
// in the game's order or another, a page at a time. Open to everyone.
@Component({
  selector: 'cdt-party-finder',
  templateUrl: './party-finder.component.html',
  styleUrl: './party-finder.component.scss',
  imports: [
    PfFiltersComponent,
    PfDataCentresComponent,
    PfListingComponent,
    ButtonComponent,
    IconComponent,
    MessageComponent,
    PagerComponent,
    PfShareDialogComponent,
    RouterLink,
  ],
  providers: [PartyFinderStore, PfShareStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartyFinderComponent {
  protected readonly store = inject(PartyFinderStore);
  protected readonly signedIn = inject(AuthStore).loggedIn;
  // Members share a listing as a post, or in the Everise Discord (where
  // the site can).
  protected readonly share = inject(PfShareStore);
  protected readonly discordAvailable = inject(DiscordSharingService).available;
  protected readonly titleOf = listingTitle;
  // Each listing opens its own page.
  protected readonly pageOf = listingPage;
  protected readonly sharedPostId = computed(() => {
    const shared = this.share.shared();
    return shared?.way === 'post' ? shared.articleId : '';
  });
  // A listing shared in the Everise Discord (?listing=<id>), shown first
  // while it's up.
  // (In the template's loops, `listing` is each listing instead.)
  readonly listing = input<string>();
  protected readonly sharedListing = computed(() =>
    this.store.board()?.listings.find((shown) => shown.id === this.listing()),
  );

  protected readonly checked = computed(() => ago(this.store.checkedAt(), this.store.now()));
  private readonly status = viewChild<ElementRef<HTMLElement>>('status');
  private readonly listingsHeading = viewChild<ElementRef<HTMLElement>>('listingsHeading');

  protected openShare(listing: PartyFinderListing, way: ShareWay, icons: PartyFinderBoard['icons']) {
    this.share.open(listing, way, this.store.dataCentre(), icons);
  }

  // Another page starts from its top, and keyboard and screen reader users
  // with it.
  protected showPage(page: number) {
    this.store.setPage(page);
    this.status()?.nativeElement.scrollIntoView?.({ block: 'start' });
    this.listingsHeading()?.nativeElement.focus({ preventScroll: true });
  }
}
