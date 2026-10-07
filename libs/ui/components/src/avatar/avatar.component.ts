import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// The picture shown for someone without one (as the backend's own default).
export const DEFAULT_AVATAR = '/assets/images/avatar-profile.png';

export type AvatarFrame = 'none' | 'soft' | 'line' | 'strong' | 'highlight';

// A round profile picture, `size` pixels across, on the avatar disc (the
// default picture is a dark outline): <cdt-avatar [src]="user.image" [size]="36" />.
// Without a picture it shows the default one. Decorative by default (it sits
// next to the name); give `alt` when it's the only thing saying who it is.
// `frame` is its ring: none, soft, line, strong, or highlight (the primary
// colour with a glow: the profile page, a character in the room).
@Component({
  selector: 'cdt-avatar',
  template: `<img
    [src]="src() || defaultAvatar"
    [alt]="alt()"
    [attr.width]="size()"
    [attr.height]="size()"
    decoding="async"
  />`,
  styleUrl: './avatar.component.scss',
  host: { '[style.--avatar-size.px]': 'size()', '[attr.data-frame]': 'frame()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  readonly src = input<string | null | undefined>();
  readonly size = input(36);
  readonly alt = input('');
  readonly frame = input<AvatarFrame>('none');

  protected readonly defaultAvatar = DEFAULT_AVATAR;
}
