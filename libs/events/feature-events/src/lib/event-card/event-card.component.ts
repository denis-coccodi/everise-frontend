import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommunityEvent } from '@everise/core/api-types';
import { isLive, whenText } from '@everise/events/data-access';
import { CardComponent, IconComponent, TagComponent } from '@everise/ui/components';

// The tags shown on a card; the event's page has the rest.
const SHOWN_TAGS = 5;

// One event: its banner, title, when and where, its rating when it's
// MATURE, the start of its description, its tags, and links to its page
// here, its team's Discord and Partake (in new tabs).
@Component({
  selector: 'cdt-event-card',
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss',
  imports: [CardComponent, IconComponent, RouterLink, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCardComponent {
  readonly event = input.required<CommunityEvent>();
  readonly now = input.required<number>();

  protected readonly when = computed(() => whenText(this.event(), this.now()));
  protected readonly live = computed(() => isLive(this.event(), this.now()));
  protected readonly where = computed(() => {
    const { world, location, dataCentre } = this.event();
    const place = [world, location].filter(Boolean).join(', ');
    return dataCentre && place ? `${place} (${dataCentre})` : place || dataCentre || '';
  });
  protected readonly tags = computed(() => this.event().tags.slice(0, SHOWN_TAGS));
  // A banner that fails to load leaves no broken picture behind.
  protected readonly bannerFailed = signal(false);
  protected readonly headingId = computed(() => `event-${this.event().id}`);
  // Its page here.
  protected readonly page = computed(() => ['/events', this.event().id]);
}
