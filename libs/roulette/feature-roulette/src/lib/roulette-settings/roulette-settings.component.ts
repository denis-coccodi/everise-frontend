import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouletteStore } from '@everise/roulette/data-access';
import {
  ButtonComponent,
  CheckboxComponent,
  InputComponent,
  MessageComponent,
  PanelComponent,
} from '@everise/ui/components';

// The "Duty Finder Settings" window: which duty types the first reel can
// land on, with how many duties each has within the level limits, and the
// level limits. Reads and changes the page's RouletteStore.
@Component({
  selector: 'cdt-roulette-settings',
  templateUrl: './roulette-settings.component.html',
  styleUrl: './roulette-settings.component.scss',
  imports: [ButtonComponent, CheckboxComponent, InputComponent, PanelComponent, MessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouletteSettingsComponent {
  protected readonly store = inject(RouletteStore);

  // While the reels spin.
  readonly disabled = input(false);

  // An image the backend doesn't have yet is left out.
  protected hideImage(event: Event) {
    if (event.target instanceof HTMLElement) event.target.hidden = true;
  }
}
