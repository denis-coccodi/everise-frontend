import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthStore } from '@everise/auth/data-access';
import { SANDS_LIMITS } from '@everise/core/api-types';
import { AvatarComponent, ButtonComponent, PanelComponent } from '@everise/ui/components';
import { WakingSandsStore } from '@everise/waking-sands/data-access';

// "Who's here": every character, with Invite or Send out for signed-in
// members (none while the room is full), and the fan-work note.
@Component({
  selector: 'cdt-sands-cast',
  templateUrl: './sands-cast.component.html',
  styleUrl: './sands-cast.component.scss',
  imports: [ButtonComponent, PanelComponent, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SandsCastComponent {
  protected readonly store = inject(WakingSandsStore);
  protected readonly signedIn = inject(AuthStore).loggedIn;
  protected readonly maxPresent = SANDS_LIMITS.maxPresent;
}
