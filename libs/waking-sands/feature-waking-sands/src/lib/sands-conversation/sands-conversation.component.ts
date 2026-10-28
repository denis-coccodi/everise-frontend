import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, inject, viewChild } from '@angular/core';
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
// message box. The newest line stays in view.
@Component({
  selector: 'cdt-sands-conversation',
  templateUrl: './sands-conversation.component.html',
  styleUrl: './sands-conversation.component.scss',
  imports: [ButtonComponent, FieldComponent, InputComponent, PanelComponent, AvatarComponent, MessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SandsConversationComponent {
  protected readonly store = inject(WakingSandsStore);

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
