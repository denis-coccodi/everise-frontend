import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WakingSandsStore } from '@everise/waking-sands/data-access';
import { SandsCastComponent } from './sands-cast/sands-cast.component';
import { SandsConversationComponent } from './sands-conversation/sands-conversation.component';

// The Waking Sands: one room every member shares, with FINAL FANTASY XIV
// characters (and the free company's own) voiced by an AI on the backend.
// Members bring characters in or send them out for everyone, and talk; the
// characters answer as they see fit, each other too. Everything arrives
// live (WakingSandsStore), so everyone on the page sees the same room.
// Guests can watch.
@Component({
  selector: 'cdt-waking-sands',
  templateUrl: './waking-sands.component.html',
  styleUrl: './waking-sands.component.scss',
  imports: [SandsCastComponent, SandsConversationComponent],
  providers: [WakingSandsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WakingSandsComponent {
  protected readonly store = inject(WakingSandsStore);
}
