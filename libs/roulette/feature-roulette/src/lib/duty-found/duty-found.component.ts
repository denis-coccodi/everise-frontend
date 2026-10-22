import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DiscordSharingService } from '@everise/articles/data-access';
import {
  ButtonComponent,
  CheckboxComponent,
  DialogComponent,
  DutyCardComponent,
  InputComponent,
} from '@everise/ui/components';
import type { Commence, RouletteResult } from './duty-found.model';

// The longest comment the backend accepts.
const MAX_COMMENT = 280;

// The result, styled after the game's "Duty Found" window. Commence posts it
// to the feeds: a signed-in user can add a comment first, and choose to share
// it in the Everise Discord too; a guest's result is posted by Tataru, on the
// site only. Withdraw spins again; closing the window posts nothing.
@Component({
  selector: 'cdt-duty-found',
  imports: [ButtonComponent, CheckboxComponent, DialogComponent, DutyCardComponent, InputComponent],
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
  // Accepts the result, with what the member chose.
  readonly commence = output<Commence>();
  readonly withdraw = output<void>();
  readonly closed = output<void>();

  protected readonly comment = signal('');
  protected readonly shareToDiscord = signal(false);
  protected readonly maxComment = MAX_COMMENT;
  protected readonly discordAvailable = inject(DiscordSharingService).available;

  // The element, not the cdtButton component on it.
  private readonly commenceButton = viewChild.required('commenceButton', { read: ElementRef<HTMLButtonElement> });

  constructor() {
    afterNextRender(() => this.commenceButton().nativeElement.focus());
  }

  protected accept() {
    if (!this.signedIn()) return this.commence.emit({});
    const comment = this.comment().trim();
    this.commence.emit({
      ...(comment ? { comment } : {}),
      ...(this.shareToDiscord() && this.discordAvailable() ? { shareToDiscord: true } : {}),
    });
  }
}
