import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonComponent, DialogComponent, DutyCardComponent, InputComponent } from '@everise/ui/components';

// The longest comment the backend accepts.
const MAX_COMMENT = 280;

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
  // The duty's or roulette's page on the community wiki.
  wiki: string;
  // Where to read up on the party setting, e.g. Awktrail's gear sets.
  guide?: { label: string; url: string };
}

// The result, styled after the game's "Duty Found" window. Commence posts it
// to the feeds: a signed-in user can add a comment first; a guest's result is
// posted by Tataru. Withdraw spins again; closing the window posts nothing.
@Component({
  selector: 'cdt-duty-found',
  imports: [ButtonComponent, DialogComponent, DutyCardComponent, InputComponent],
  templateUrl: './duty-found.component.html',
  styleUrls: ['./duty-found.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DutyFoundComponent {
  readonly result = input.required<RouletteResult>();
  readonly signedIn = input(false);
  // While the result is being posted, and why posting failed.
  readonly posting = input(false);
  readonly postError = input<string | null>(null);
  // Accepts the result, with the comment ('' for none).
  readonly commence = output<string>();
  readonly withdraw = output<void>();
  readonly closed = output<void>();

  protected readonly comment = signal('');
  protected readonly maxComment = MAX_COMMENT;

  // The element, not the cdtButton component on it.
  private readonly commenceButton = viewChild.required('commenceButton', { read: ElementRef<HTMLButtonElement> });

  constructor() {
    afterNextRender(() => this.commenceButton().nativeElement.focus());
  }
}
