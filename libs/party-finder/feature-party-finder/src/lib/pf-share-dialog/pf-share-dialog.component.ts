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
import { PfShareStore, listingTitle } from '@everise/party-finder/data-access';
import {
  ButtonComponent,
  CheckboxComponent,
  DialogComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
} from '@everise/ui/components';

// The longest message the backend takes with a shared listing.
const MAX_MESSAGE = 280;

// The share window for one listing: what's shared, an optional message, and
// (for a post) whether it goes to the Everise Discord too. Shown while
// PfShareStore has a listing open; sending or closing ends it.
@Component({
  selector: 'cdt-pf-share-dialog',
  templateUrl: './pf-share-dialog.component.html',
  styleUrl: './pf-share-dialog.component.scss',
  imports: [ButtonComponent, CheckboxComponent, DialogComponent, FieldComponent, InputComponent, MessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PfShareDialogComponent {
  protected readonly store = inject(PfShareStore);
  protected readonly discordAvailable = inject(DiscordSharingService).available;
  protected readonly maxMessage = MAX_MESSAGE;

  protected readonly message = signal('');
  protected readonly alsoDiscord = signal(false);

  protected readonly asPost = computed(() => this.store.sharing()?.way === 'post');
  protected readonly heading = computed(() => (this.asPost() ? 'Share as post' : 'Share to Discord'));
  protected readonly title = computed(() => {
    const listing = this.store.sharing()?.listing;
    return listing ? listingTitle(listing) : '';
  });

  // The element, not the cdtInput component on it.
  private readonly messageBox = viewChild.required('messageBox', { read: ElementRef<HTMLTextAreaElement> });

  constructor() {
    // The window opens on the message, ready to type.
    afterNextRender(() => this.messageBox().nativeElement.focus());
  }

  protected send() {
    this.store.send({ comment: this.message(), shareToDiscord: this.asPost() && this.alsoDiscord() });
  }
}
