import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { AvatarComponent, ButtonComponent, PanelComponent } from '@everise/ui/components';
import { WakingSandsStore } from '@everise/waking-sands/data-access';

// "Who's here": every character, their name leading to their profile, with
// Invite or Send out for signed-in members (none while the room is full),
// and the fan-work note.
@Component({
  selector: 'cdt-sands-cast',
  templateUrl: './sands-cast.component.html',
  styleUrl: './sands-cast.component.scss',
  imports: [ButtonComponent, PanelComponent, AvatarComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SandsCastComponent {
  protected readonly store = inject(WakingSandsStore);
  protected readonly signedIn = inject(AuthStore).loggedIn;
}
