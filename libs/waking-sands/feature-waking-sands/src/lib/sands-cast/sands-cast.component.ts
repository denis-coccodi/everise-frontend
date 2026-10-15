import { NgTemplateOutlet } from '@angular/common';
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

// "Who's here": the characters in the room, then everyone else, found by
// name or title with the search, in a list that scrolls on its own; each
// name leads to their profile, with Invite or Send out for signed-in members
// (none while the room is full), and the fan-work note.
@Component({
  selector: 'cdt-sands-cast',
  templateUrl: './sands-cast.component.html',
  styleUrl: './sands-cast.component.scss',
  imports: [
    ButtonComponent,
    PanelComponent,
    AvatarComponent,
    FieldComponent,
    InputComponent,
    NgTemplateOutlet,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SandsCastComponent {
  protected readonly store = inject(WakingSandsStore);
  protected readonly signedIn = inject(AuthStore).loggedIn;
  // For screen readers: how many characters the search shows.
  protected readonly found = computed(() => {
    const count = this.store.others().length;
    return `${count} ${count === 1 ? 'character' : 'characters'} found`;
  });
}
