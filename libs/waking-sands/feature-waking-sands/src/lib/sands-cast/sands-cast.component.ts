import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AvatarComponent,
  ButtonComponent,
  FieldComponent,
  InputComponent,
  PanelComponent,
} from '@everise/ui/components';
import { WakingSandsStore } from '@everise/waking-sands/data-access';

// "Who's here": the characters in the room, then everyone else, found by
// name or title with the search, in a list that scrolls on its own: the
// game's characters, then the free company's own (`local`). Each name leads
// to their profile, with Invite or Send out (no Invite while the room is
// full).
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
  // Everyone else, the game's characters apart from the free company's own;
  // a group nobody in the search belongs to isn't shown.
  protected readonly groups = computed(() => {
    const others = this.store.others();
    return [
      { heading: 'Friends and foes of the Warrior of Light', characters: others.filter((c) => !c.local) },
      { heading: "Vesper Bay's regulars", characters: others.filter((c) => c.local) },
    ].filter((group) => group.characters.length > 0);
  });
  // For screen readers: how many characters the search shows.
  protected readonly found = computed(() => {
    const count = this.store.others().length;
    return `${count} ${count === 1 ? 'character' : 'characters'} found`;
  });
}
