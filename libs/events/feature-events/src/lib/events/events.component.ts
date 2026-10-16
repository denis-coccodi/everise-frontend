import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { EventsStore } from '@everise/events/data-access';
import { ButtonComponent, CardComponent, IconComponent, MessageComponent } from '@everise/ui/components';
import { EventCardComponent } from '../event-card/event-card.component';
import { EventDataCentresComponent } from '../event-data-centres/event-data-centres.component';

// Events: the community's FFXIV events this week (club nights, parties,
// races, gatherings), those on now first, then by the day they start, as
// Partake lists them: every data centre's, or one's (?dc=chaos). Only those
// rated at most MATURE, which are labelled. Open to everyone.
@Component({
  selector: 'cdt-events',
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss',
  imports: [
    ButtonComponent,
    CardComponent,
    IconComponent,
    MessageComponent,
    RouterLink,
    EventCardComponent,
    EventDataCentresComponent,
  ],
  providers: [EventsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent {
  protected readonly store = inject(EventsStore);
  protected readonly signedIn = inject(AuthStore).loggedIn;
}
