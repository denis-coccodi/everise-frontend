import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ButtonComponent, DialogComponent } from '@realworld/ui/components';

export interface RouletteResult {
  type: string;
  name: string;
  // Level and item level, or the roulette's duty type.
  detail: string;
  mode: string;
  // True when the game picks the duty (a duty roulette).
  dutyUnknown: boolean;
  // The job dealt by dealer's choice.
  job?: { name: string; icon?: string };
  // The duty's or roulette's banner.
  image?: string;
  // Where to read up on the party setting, e.g. Awktrail's gear sets.
  guide?: { label: string; url: string };
}

// The result, styled after the game's "Duty Found" window.
@Component({
  selector: 'cdt-duty-found',
  imports: [ButtonComponent, DialogComponent],
  templateUrl: './duty-found.component.html',
  styleUrls: ['./duty-found.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DutyFoundComponent {
  readonly result = input.required<RouletteResult>();
  readonly commence = output<void>();
  readonly withdraw = output<void>();

  // The element, not the cdtButton component on it.
  private readonly commenceButton = viewChild.required('commenceButton', { read: ElementRef<HTMLButtonElement> });

  constructor() {
    afterNextRender(() => this.commenceButton().nativeElement.focus());
  }

  // An image the backend doesn't have yet is left out.
  protected hideImage(event: Event) {
    (event.target as HTMLElement).hidden = true;
  }
}
