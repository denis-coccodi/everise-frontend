import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PartyFinderListing, PartyRole } from '@everise/core/api-types';
import { categoryName, listingTitle } from '@everise/party-finder/data-access';
import { CardComponent, TagComponent } from '@everise/ui/components';
import { ago, timeLeft } from '../listing-time';

const OBJECTIVES = { completion: 'Duty completion', practice: 'Practice', loot: 'Loot' } as const;
const LOOT = { normal: '', 'greed-only': 'Greed only', lootmaster: 'Lootmaster' } as const;
const ROLE_NAMES: Record<PartyRole, string> = { tank: 'Tank', healer: 'Healer', dps: 'DPS' };

// One Party Finder listing: what it's for, its conditions, the party's
// slots (jobs in, roles open), the recruiter, and how long it has left.
@Component({
  selector: 'cdt-pf-listing',
  templateUrl: './pf-listing.component.html',
  styleUrl: './pf-listing.component.scss',
  imports: [CardComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PfListingComponent {
  readonly listing = input.required<PartyFinderListing>();
  // The page's clock, for the time left.
  readonly now = input.required<number>();

  protected readonly title = computed(() => listingTitle(this.listing()));
  protected readonly category = computed(() => categoryName(this.listing().category));
  protected readonly objective = computed(() => {
    const objective = this.listing().objective;
    return objective ? OBJECTIVES[objective] : '';
  });
  protected readonly loot = computed(() => LOOT[this.listing().loot]);
  protected readonly filled = computed(() => this.listing().slots.filter((slot) => slot.job).length);
  protected readonly timeLeft = computed(() => timeLeft(this.listing().expiresAt, this.now()));
  protected readonly seen = computed(() => ago(this.listing().updatedAt, this.now()));

  // An open slot's roles in words: "Tank", "Healer or DPS", "Any role".
  protected openTo(roles: PartyRole[]) {
    if (roles.length === 3 || roles.length === 0) return 'Any role';
    return roles.map((role) => ROLE_NAMES[role]).join(' or ');
  }
}
