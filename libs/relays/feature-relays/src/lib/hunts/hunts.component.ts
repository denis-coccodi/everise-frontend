import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { HuntsStore } from '@everise/relays/data-access';
import { MessageComponent, PanelComponent } from '@everise/ui/components';
import { DiscordMessageComponent } from '../discord-message/discord-message.component';
import { trainStatus } from './train-status';

// The Hunts tab: the hunt trains the hunt groups announce, as the Everise
// Discord gets them, a window per data centre (Light first): those to
// come, those running, and the last one that started. Asked again every
// minute. Open to guests.
@Component({
  selector: 'cdt-hunts',
  templateUrl: './hunts.component.html',
  styleUrl: './hunts.component.scss',
  imports: [PanelComponent, MessageComponent, DiscordMessageComponent],
  providers: [HuntsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HuntsComponent {
  protected readonly store = inject(HuntsStore);

  // Each data centre's trains, with where each is at (moving with the clock).
  protected readonly sections = computed(() =>
    this.store.sections().map((section) => ({
      ...section,
      trains: section.trains.map((train) => ({ ...train, status: trainStatus(train.startsAt, this.store.now()) })),
    })),
  );
}
