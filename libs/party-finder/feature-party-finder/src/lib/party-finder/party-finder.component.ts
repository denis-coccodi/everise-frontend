import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PartyFinderStore } from '@everise/party-finder/data-access';
import { ButtonComponent, IconComponent, MessageComponent } from '@everise/ui/components';
import { ago } from '../listing-time';
import { PfFiltersComponent } from '../pf-filters/pf-filters.component';
import { PfListingComponent } from '../pf-listing/pf-listing.component';

// The Party Finder: the listings up on Light (Everise's data centre, from
// Odin to start) or Chaos, as xivpf.com collects them from players'
// plugins, refreshed every 30 seconds while the page is in view
// (PartyFinderStore). Open to everyone.
@Component({
  selector: 'cdt-party-finder',
  templateUrl: './party-finder.component.html',
  styleUrl: './party-finder.component.scss',
  imports: [PfFiltersComponent, PfListingComponent, ButtonComponent, IconComponent, MessageComponent],
  providers: [PartyFinderStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartyFinderComponent {
  protected readonly store = inject(PartyFinderStore);

  protected readonly checked = computed(() => ago(this.store.checkedAt(), this.store.now()));
}
