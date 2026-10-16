import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventsStore, eventsQuery } from '@everise/events/data-access';

// A link to every data centre's events and to each one with events this
// week, the shown one current. Reads the page's EventsStore.
@Component({
  selector: 'cdt-event-data-centres',
  templateUrl: './event-data-centres.component.html',
  styleUrl: './event-data-centres.component.scss',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDataCentresComponent {
  protected readonly store = inject(EventsStore);
  protected readonly queryFor = eventsQuery;

  protected current(name: string | null) {
    return name === this.store.dataCentre() ? 'page' : null;
  }
}
