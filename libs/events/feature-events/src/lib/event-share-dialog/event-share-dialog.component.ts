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
import { EventDetail } from '@everise/core/api-types';
import { EventShareStore } from '@everise/events/data-access';
import {
  ButtonComponent,
  DialogComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
} from '@everise/ui/components';

// The longest message the backend takes with a shared event.
const MAX_MESSAGE = 280;

// The window for sharing an event in the Everise Discord: which event, and an
// optional message. Shown while EventShareStore has it open; sending or
// closing ends it.
@Component({
  selector: 'cdt-event-share-dialog',
  templateUrl: './event-share-dialog.component.html',
  styleUrl: './event-share-dialog.component.scss',
  imports: [ButtonComponent, DialogComponent, FieldComponent, InputComponent, MessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventShareDialogComponent {
  readonly event = input.required<EventDetail>();

  protected readonly store = inject(EventShareStore);
  protected readonly maxMessage = MAX_MESSAGE;
  protected readonly message = signal('');

  // The element, not the component on it.
  private readonly messageBox = viewChild.required('messageBox', { read: ElementRef<HTMLTextAreaElement> });

  constructor() {
    // The window opens on the message, ready to type.
    afterNextRender(() => this.messageBox().nativeElement.focus());
  }

  protected send() {
    if (!this.store.sending()) this.store.send({ eventId: this.event().id, comment: this.message() });
  }
}
