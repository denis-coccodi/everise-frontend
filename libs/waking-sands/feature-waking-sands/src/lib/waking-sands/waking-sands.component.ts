import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { ButtonComponent, PanelComponent } from '@everise/ui/components';
import { SandsRoomComponent } from '../sands-room/sands-room.component';

// The Waking Sands: one room every member shares, with FINAL FANTASY XIV
// characters (and the free company's own) voiced by an AI on the backend.
// Members bring characters in or send them out for everyone, and talk; the
// characters answer as they see fit, each other too. Everything arrives
// live, so everyone on the page sees the same room. Guests are invited to
// sign in instead: the room is members only.
@Component({
  selector: 'cdt-waking-sands',
  templateUrl: './waking-sands.component.html',
  styleUrl: './waking-sands.component.scss',
  imports: [SandsRoomComponent, PanelComponent, ButtonComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WakingSandsComponent {
  protected readonly auth = inject(AuthStore);
}
