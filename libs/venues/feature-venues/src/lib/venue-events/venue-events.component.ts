import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommunityEvent } from '@everise/core/api-types';
import { EventCardComponent } from '@everise/events/event-card';
import { IconComponent } from '@everise/ui/components';

// "Upcoming events here" on a venue's page, beside its description: the week's
// events on Partake the backend is sure are held at the venue (on its
// world, at its house or run by its Discord's team), each a card with its
// banner linking to its page on the site. Shows nothing when there are none.
@Component({
  selector: 'cdt-venue-events',
  templateUrl: './venue-events.component.html',
  styleUrl: './venue-events.component.scss',
  imports: [EventCardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueEventsComponent {
  readonly events = input.required<CommunityEvent[]>();
  readonly now = input.required<number>();

  // The ones not over yet, soonest first.
  protected readonly shown = computed(() =>
    this.events()
      .filter((event) => Date.parse(event.endsAt) > this.now())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  );
  protected readonly count = computed(() =>
    this.shown().length === 1 ? 'One event' : `${this.shown().length} events`,
  );
}
