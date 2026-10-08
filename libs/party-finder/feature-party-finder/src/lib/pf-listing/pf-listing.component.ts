import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { PartyFinderBoard, PartyFinderListing } from '@everise/core/api-types';
import { API_URL, gameImageUrl } from '@everise/core/http-client';
import { categoryName, listingTitle } from '@everise/party-finder/data-access';
import { CardComponent } from '@everise/ui/components';
import { ago, timeLeft } from '../listing-time';
import { PfPartyComponent } from '../pf-party/pf-party.component';

const OBJECTIVES = { completion: 'Duty Completion', practice: 'Practice', loot: 'Loot' } as const;
const LOOT = { normal: '', 'greed-only': 'Greed Only', lootmaster: 'Lootmaster' } as const;

// One Party Finder listing, laid out like the game's: what it's for (its
// duty type's icon, and the sprout when beginners are welcome), the recruiter, the conditions in
// brackets, the description, where the party is, the item level and how
// many players it still needs, and its slots.
@Component({
  selector: 'cdt-pf-listing',
  templateUrl: './pf-listing.component.html',
  styleUrl: './pf-listing.component.scss',
  imports: [CardComponent, PfPartyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PfListingComponent {
  readonly listing = input.required<PartyFinderListing>();
  // The page's clock, for the time left.
  readonly now = input.required<number>();
  readonly icons = input.required<PartyFinderBoard['icons']>();

  private readonly apiUrl = inject(API_URL);
  // The sprout didn't load: words instead, tried again on the next refresh.
  protected readonly sproutMissing = linkedSignal({ source: this.listing, computation: () => false });

  // Nor did the duty type's icon: none, tried again on the next refresh.
  protected readonly dutyIconMissing = linkedSignal({ source: this.listing, computation: () => false });

  protected readonly title = computed(() => listingTitle(this.listing()));
  protected readonly dutyIcon = computed(() => {
    const icon = this.listing().dutyIcon;
    return icon === null || this.dutyIconMissing() ? null : gameImageUrl(this.apiUrl, icon);
  });
  protected readonly category = computed(() => categoryName(this.listing().category));
  protected readonly sprout = computed(() => gameImageUrl(this.apiUrl, this.icons().beginner));
  // The game's conditions line: [Practice][Duty Complete]...
  protected readonly conditions = computed(() => {
    const listing = this.listing();
    return [
      listing.objective ? OBJECTIVES[listing.objective] : '',
      listing.dutyComplete ? 'Duty Complete' : '',
      LOOT[listing.loot],
      listing.onePlayerPerJob ? 'One Player per Job' : '',
    ].filter(Boolean);
  });
  protected readonly remaining = computed(() => this.listing().slots.filter((slot) => !slot.job).length);
  protected readonly timeLeft = computed(() => timeLeft(this.listing().expiresAt, this.now()));
  protected readonly seen = computed(() => ago(this.listing().updatedAt, this.now()));
}
