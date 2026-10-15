import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Venue } from '@everise/core/api-types';
import { isOpen, openingText } from '@everise/venues/data-access';
import { CardComponent, TagComponent } from '@everise/ui/components';

// The tags shown on a card; the venue's page has the rest.
const SHOWN_TAGS = 6;

// One venue: its banner, name, where and when, what the owners say, its
// tags, and links to its page here, its Discord and website (in new tabs).
@Component({
  selector: 'cdt-venue-card',
  templateUrl: './venue-card.component.html',
  styleUrl: './venue-card.component.scss',
  imports: [CardComponent, RouterLink, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueCardComponent {
  readonly venue = input.required<Venue>();
  readonly now = input.required<number>();

  protected readonly opening = computed(() => openingText(this.venue(), this.now()));
  protected readonly open = computed(() => isOpen(this.venue(), this.now()));
  // The owners' first paragraph: the venue's page has the whole story.
  protected readonly summary = computed(() => this.venue().description[0] ?? '');
  protected readonly tags = computed(() => this.venue().tags.slice(0, SHOWN_TAGS));
  // A banner that fails to load leaves no broken picture behind.
  protected readonly bannerFailed = signal(false);
  protected readonly headingId = computed(() => `venue-${this.venue().id}`);
  // Its page here.
  protected readonly page = computed(() => ['/venues', this.venue().id]);
}
