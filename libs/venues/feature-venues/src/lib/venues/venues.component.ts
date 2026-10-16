import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { VenuesStore } from '@everise/venues/data-access';
import {
  ButtonComponent,
  CardComponent,
  FieldComponent,
  IconComponent,
  InputComponent,
  MessageComponent,
} from '@everise/ui/components';
import { VenueCardComponent } from '../venue-card/venue-card.component';
import { VenueDataCentresComponent } from '../venue-data-centres/venue-data-centres.component';

// Venues: the community's player-run venues (taverns, cafés, clubs...) on a
// data centre (?dc=chaos; else Light, Everise's), those open now first, then
// the rest of the week, as FFXIV Venues lists them. Only the safe-for-work
// ones its team approved. Open to everyone.
@Component({
  selector: 'cdt-venues',
  templateUrl: './venues.component.html',
  styleUrl: './venues.component.scss',
  imports: [
    ButtonComponent,
    CardComponent,
    FieldComponent,
    IconComponent,
    InputComponent,
    MessageComponent,
    RouterLink,
    VenueCardComponent,
    VenueDataCentresComponent,
  ],
  providers: [VenuesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenuesComponent {
  protected readonly store = inject(VenuesStore);
  protected readonly signedIn = inject(AuthStore).loggedIn;

  // Said to screen readers while searching: how many venues match.
  protected readonly matches = computed(() => {
    if (!this.store.search().trim() || this.store.loadState() !== 'ready') return '';
    const total = this.store.total();
    return total === 1 ? '1 venue matches' : `${total} venues match`;
  });

  // The element, not the component on it.
  private readonly searchBox = viewChild.required('box', { read: ElementRef<HTMLInputElement> });

  // The button goes with the message it's in: the focus goes back to the box.
  protected clearSearch() {
    this.store.setSearch('');
    this.searchBox().nativeElement.focus();
  }
}
