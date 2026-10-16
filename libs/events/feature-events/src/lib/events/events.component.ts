import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { EventsStore } from '@everise/events/data-access';
import {
  ButtonComponent,
  CardComponent,
  FieldComponent,
  IconComponent,
  InputComponent,
  MessageComponent,
} from '@everise/ui/components';
import { EventCardComponent } from '@everise/events/event-card';
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
    FieldComponent,
    IconComponent,
    InputComponent,
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

  // Said to screen readers while searching: how many events match.
  protected readonly matches = computed(() => {
    if (!this.store.search().trim() || this.store.loadState() !== 'ready') return '';
    const total = this.store.total();
    return total === 1 ? '1 event matches' : `${total} events match`;
  });

  // The element, not the component on it.
  private readonly searchBox = viewChild.required('box', { read: ElementRef<HTMLInputElement> });

  // The button goes with the message it's in: the focus goes back to the box.
  protected clearSearch() {
    this.store.setSearch('');
    this.searchBox().nativeElement.focus();
  }
}
