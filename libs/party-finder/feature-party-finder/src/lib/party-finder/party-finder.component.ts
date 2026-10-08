import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { PartyFinderStore } from '@everise/party-finder/data-access';
import { ButtonComponent, IconComponent, MessageComponent, PagerComponent } from '@everise/ui/components';
import { ago } from '../listing-time';
import { PfFiltersComponent } from '../pf-filters/pf-filters.component';
import { PfListingComponent } from '../pf-listing/pf-listing.component';

// The Party Finder: the listings up on a data centre (Light, Everise's, from
// Odin to start), as xivpf.com collects them from players' plugins,
// refreshed every 30 seconds while the page is in view (PartyFinderStore),
// in the game's order or another, a page at a time. Open to everyone.
@Component({
  selector: 'cdt-party-finder',
  templateUrl: './party-finder.component.html',
  styleUrl: './party-finder.component.scss',
  imports: [PfFiltersComponent, PfListingComponent, ButtonComponent, IconComponent, MessageComponent, PagerComponent],
  providers: [PartyFinderStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartyFinderComponent {
  protected readonly store = inject(PartyFinderStore);

  protected readonly checked = computed(() => ago(this.store.checkedAt(), this.store.now()));
  private readonly status = viewChild<ElementRef<HTMLElement>>('status');
  private readonly listingsHeading = viewChild<ElementRef<HTMLElement>>('listingsHeading');

  // Another page starts from its top, and keyboard and screen reader users
  // with it.
  protected showPage(page: number) {
    this.store.setPage(page);
    this.status()?.nativeElement.scrollIntoView?.({ block: 'start' });
    this.listingsHeading()?.nativeElement.focus({ preventScroll: true });
  }
}
