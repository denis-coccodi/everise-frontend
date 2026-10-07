import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@realworld/auth/data-access';
import { SANDS_LIMITS } from '@realworld/core/api-types';
import { ButtonComponent, FieldComponent, InputComponent, PanelComponent } from '@realworld/ui/components';
import { WakingSandsStore } from '@realworld/waking-sands/data-access';
import { DEFAULT_PICTURE } from '../default-picture';

// The conversation: the day's lines (yours on the right, other members' and
// the characters' on the left, notes in between), who's writing, and the
// message box for signed-in members. The newest line stays in view.
@Component({
  selector: 'cdt-sands-conversation',
  templateUrl: './sands-conversation.component.html',
  styleUrl: './sands-conversation.component.scss',
  imports: [RouterLink, ButtonComponent, FieldComponent, InputComponent, PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SandsConversationComponent {
  protected readonly store = inject(WakingSandsStore);
  protected readonly signedIn = inject(AuthStore).loggedIn;
  protected readonly maxLength = SANDS_LIMITS.maxLineLength;
  protected readonly defaultPicture = DEFAULT_PICTURE;

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
