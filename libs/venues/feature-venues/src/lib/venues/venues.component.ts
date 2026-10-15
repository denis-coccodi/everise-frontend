import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { VenuesStore } from '@everise/venues/data-access';
import { ButtonComponent, CardComponent, IconComponent, MessageComponent } from '@everise/ui/components';
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
    IconComponent,
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
}
