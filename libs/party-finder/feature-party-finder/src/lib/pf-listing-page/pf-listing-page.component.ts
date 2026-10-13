import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PfListingStore, dataCentreQuery, listingTitle } from '@everise/party-finder/data-access';
import { PfListingComponent, ago } from '@everise/party-finder/feature-pf-listing';
import { MessageComponent } from '@everise/ui/components';

// One Party Finder listing's own page (/party-finder/listings/<id>), which
// anyone with the link can open while the listing is up: the listing as the
// Party Finder shows it, checked again while the page is in view. Once it's
// gone (filled up, ended, taken down), or for an address that was never a
// listing's, the backend's words say so, with a way back to its data
// centre's listings. Open to everyone.
@Component({
  selector: 'cdt-pf-listing-page',
  templateUrl: './pf-listing-page.component.html',
  styleUrl: './pf-listing-page.component.scss',
  imports: [PfListingComponent, MessageComponent, RouterLink],
  providers: [PfListingStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PfListingPageComponent {
  protected readonly store = inject(PfListingStore);
  // Back to the data centre's listings, all its worlds.
  protected readonly back = computed(() => {
    const dataCentre = this.store.dataCentre();
    return dataCentre ? { name: `${dataCentre} Party Finder`, query: dataCentreQuery(dataCentre) } : null;
  });
  protected readonly checked = computed(() => {
    const found = this.store.found();
    return found ? ago(found.fetchedAt, this.store.now()) : '';
  });

  constructor() {
    // The tab names the listing once it's known.
    const title = inject(Title);
    effect(() => {
      const found = this.store.found();
      if (found) title.setTitle(`${listingTitle(found.listing)} · ${found.dataCentre} Party Finder · Everise`);
    });
  }
}
