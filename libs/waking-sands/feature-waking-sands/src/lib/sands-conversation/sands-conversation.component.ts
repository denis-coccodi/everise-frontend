import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import {
  AvatarComponent,
  ButtonComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
  PanelComponent,
} from '@everise/ui/components';
import { WakingSandsStore } from '@everise/waking-sands/data-access';

// The conversation: the day's lines (yours on the right, other members' and
// the characters' on the left, notes in between), who's writing, and the
// message box for signed-in members. The newest line stays in view.
@Component({
  selector: 'cdt-sands-conversation',
  templateUrl: './sands-conversation.component.html',
  styleUrl: './sands-conversation.component.scss',
  imports: [
    RouterLink,
    ButtonComponent,
    FieldComponent,
    InputComponent,
    PanelComponent,
    AvatarComponent,
    MessageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SandsConversationComponent {
  protected readonly store = inject(WakingSandsStore);
  protected readonly signedIn = inject(AuthStore).loggedIn;

  private readonly logBox = viewChild<ElementRef<HTMLElement>>('logBox');

  constructor() {
    afterRenderEffect(() => {
      this.store.lines();
      this.store.writing();
      const box = this.logBox()?.nativeElement;
      if (box) box.scrollTop = box.scrollHeight;
    });
  }

  // Enter sends; Shift+Enter starts a new line.
  protected onEnter(event: Event) {
    if (event instanceof KeyboardEvent && event.shiftKey) return;
    event.preventDefault();
    this.send();
  }

  protected send(event?: Event) {
    event?.preventDefault();
    if (this.store.canSend()) this.store.send();
  }
}
