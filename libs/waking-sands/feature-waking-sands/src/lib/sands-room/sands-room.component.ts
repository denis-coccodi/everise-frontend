import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WakingSandsStore } from '@everise/waking-sands/data-access';
import { SandsCastComponent } from '../sands-cast/sands-cast.component';
import { SandsConversationComponent } from '../sands-conversation/sands-conversation.component';

// The room itself, for members only: it provides the store, so the room is
// loaded and followed live only once a member opens it.
@Component({
  selector: 'cdt-sands-room',
  templateUrl: './sands-room.component.html',
  styleUrl: './sands-room.component.scss',
  imports: [SandsCastComponent, SandsConversationComponent],
  providers: [WakingSandsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SandsRoomComponent {
  protected readonly store = inject(WakingSandsStore);
}
