import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DiscordSharingService } from '@everise/articles/data-access';
import { PfShareStore } from '@everise/party-finder/data-access';
import { PfListingComponent } from '@everise/party-finder/feature-pf-listing';
import {
  ButtonComponent,
  CheckboxComponent,
  DialogComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
} from '@everise/ui/components';
import { cardPicture } from './card-picture';

// The longest message the backend takes with a shared listing.
const MAX_MESSAGE = 280;

// The share window for one listing: the listing's card as it'll be shared,
// an optional message, and (for a post) whether it goes to the Everise
// Discord too. Anything going to Discord takes a picture of the card along.
// Shown while PfShareStore has a listing open; sending or closing ends it.
@Component({
  selector: 'cdt-pf-share-dialog',
  templateUrl: './pf-share-dialog.component.html',
  styleUrl: './pf-share-dialog.component.scss',
  imports: [
    ButtonComponent,
    CheckboxComponent,
    DialogComponent,
    FieldComponent,
    InputComponent,
    MessageComponent,
    PfListingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PfShareDialogComponent {
  protected readonly store = inject(PfShareStore);
  protected readonly discordAvailable = inject(DiscordSharingService).available;
  protected readonly maxMessage = MAX_MESSAGE;
  // The card's time left, from when the window opened.
  protected readonly now = Date.now();

  protected readonly message = signal('');
  protected readonly alsoDiscord = signal(false);
  // Drawing the card's picture, before sending.
  protected readonly preparing = signal(false);
  protected readonly busy = computed(() => this.preparing() || this.store.sending());

  protected readonly asPost = computed(() => this.store.sharing()?.way === 'post');
  protected readonly heading = computed(() => (this.asPost() ? 'Share as post' : 'Share to Discord'));

  // The elements, not the components on them.
  private readonly messageBox = viewChild.required('messageBox', { read: ElementRef<HTMLTextAreaElement> });
  private readonly card = viewChild.required(PfListingComponent, { read: ElementRef<HTMLElement> });

  constructor() {
    // The window opens on the message, ready to type.
    afterNextRender(() => this.messageBox().nativeElement.focus());
  }

  protected async send() {
    if (this.busy()) return;
    const toDiscord = !this.asPost() || this.alsoDiscord();
    this.preparing.set(true);
    const picture = toDiscord ? await cardPicture(this.card().nativeElement) : undefined;
    this.preparing.set(false);
    this.store.send({ comment: this.message(), shareToDiscord: this.asPost() && this.alsoDiscord(), picture });
  }
}
