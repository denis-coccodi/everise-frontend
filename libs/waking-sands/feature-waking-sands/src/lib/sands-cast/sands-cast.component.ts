import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthStore } from '@realworld/auth/data-access';
import { SANDS_LIMITS } from '@realworld/core/api-types';
import { ButtonComponent, PanelComponent } from '@realworld/ui/components';
import { WakingSandsStore } from '@realworld/waking-sands/data-access';
import { DEFAULT_PICTURE } from '../default-picture';

// "Who's here": every character, with Invite or Send out for signed-in
// members (none while the room is full), and the fan-work note.
@Component({
  selector: 'cdt-sands-cast',
  templateUrl: './sands-cast.component.html',
  styleUrl: './sands-cast.component.scss',
  imports: [ButtonComponent, PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SandsCastComponent {
  protected readonly store = inject(WakingSandsStore);
  protected readonly signedIn = inject(AuthStore).loggedIn;
  protected readonly maxPresent = SANDS_LIMITS.maxPresent;
  protected readonly defaultPicture = DEFAULT_PICTURE;
}
