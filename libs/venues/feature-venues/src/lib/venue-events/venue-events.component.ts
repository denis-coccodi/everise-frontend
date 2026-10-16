import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommunityEvent } from '@everise/core/api-types';
import { isLive, whenText } from '@everise/events/data-access';
import { TagComponent } from '@everise/ui/components';

// "Upcoming events here" on a venue's page: the week's events on Partake
// the backend is sure are held at the venue (on its world, at its house or
// run by its Discord's team), each linking to its page on the site. Shows
// nothing when there are none.
@Component({
  selector: 'cdt-venue-events',
  templateUrl: './venue-events.component.html',
  styleUrl: './venue-events.component.scss',
  imports: [RouterLink, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueEventsComponent {
  readonly events = input.required<CommunityEvent[]>();
  readonly now = input.required<number>();

  // The ones not over yet, soonest first.
  protected readonly shown = computed(() =>
    this.events()
      .filter((event) => Date.parse(event.endsAt) > this.now())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((event) => ({
        ...event,
        when: whenText(event, this.now()),
        live: isLive(event, this.now()),
      })),
  );
}
