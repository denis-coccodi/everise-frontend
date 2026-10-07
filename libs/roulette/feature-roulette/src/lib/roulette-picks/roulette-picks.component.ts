import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { GOLD_SAUCER_TYPE, PVP_TYPE, ROULETTES_TYPE, RouletteStore } from '@realworld/roulette/data-access';
import { ButtonComponent, CheckboxComponent, PanelComponent } from '@realworld/ui/components';

// The explanation above each picked type's list.
const LEGENDS: Record<string, string> = {
  [ROULETTES_TYPE]: 'Duty roulettes the first reel\'s "Duty Roulettes" can land on',
  [PVP_TYPE]: 'PvP queues the first reel\'s "PvP" can land on',
  [GOLD_SAUCER_TYPE]: 'Gold Saucer activities the first reel\'s "Gold Saucer" can land on',
};

// One window per ticked type whose entries are picked one by one (duty
// roulettes, PvP, Gold Saucer), listing what the reels can land on.
@Component({
  selector: 'cdt-roulette-picks',
  templateUrl: './roulette-picks.component.html',
  styleUrl: './roulette-picks.component.scss',
  imports: [ButtonComponent, CheckboxComponent, PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoulettePicksComponent {
  protected readonly store = inject(RouletteStore);
  protected readonly legends = LEGENDS;

  // While the reels spin.
  readonly disabled = input(false);
}
