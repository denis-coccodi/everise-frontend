import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import {
  AvatarComponent,
  ButtonComponent,
  FieldComponent,
  InputComponent,
  PanelComponent,
} from '@everise/ui/components';
import { WakingSandsStore } from '@everise/waking-sands/data-access';

// "Who's here": every character, those in the room first and the rest found
// by name or title with the search; each name leads to their profile, with
// Invite or Send out for signed-in members (none while the room is full),
// and the fan-work note.
@Component({
  selector: 'cdt-sands-cast',
  templateUrl: './sands-cast.component.html',
  styleUrl: './sands-cast.component.scss',
  imports: [ButtonComponent, PanelComponent, AvatarComponent, FieldComponent, InputComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SandsCastComponent {
  protected readonly store = inject(WakingSandsStore);
  protected readonly signedIn = inject(AuthStore).loggedIn;
  // For screen readers: how many characters the list shows.
  protected readonly found = computed(() => {
    const count = this.store.cast().length;
    return `${count} ${count === 1 ? 'character' : 'characters'} shown`;
  });
}
