import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { VenueDetail } from '@everise/core/api-types';
import { VenueShareStore } from '@everise/venues/data-access';
import {
  ButtonComponent,
  DialogComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
} from '@everise/ui/components';

// The longest message the backend takes with a shared venue.
const MAX_MESSAGE = 280;

// The window for sharing a venue in the Everise Discord: which venue, and an
// optional message. Shown while VenueShareStore has it open; sending or
// closing ends it.
@Component({
  selector: 'cdt-venue-share-dialog',
  templateUrl: './venue-share-dialog.component.html',
  styleUrl: './venue-share-dialog.component.scss',
  imports: [ButtonComponent, DialogComponent, FieldComponent, InputComponent, MessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueShareDialogComponent {
  readonly venue = input.required<VenueDetail>();

  protected readonly store = inject(VenueShareStore);
  protected readonly maxMessage = MAX_MESSAGE;
  protected readonly message = signal('');

  // The element, not the component on it.
  private readonly messageBox = viewChild.required('messageBox', { read: ElementRef<HTMLTextAreaElement> });

  constructor() {
    // The window opens on the message, ready to type.
    afterNextRender(() => this.messageBox().nativeElement.focus());
  }

  protected send() {
    if (!this.store.sending()) this.store.send({ venueId: this.venue().id, comment: this.message() });
  }
}
