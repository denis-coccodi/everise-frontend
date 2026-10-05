import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

// Who wrote something and when: an avatar, the author's name and the date.
// <cdt-byline [image]="a.image" [name]="a.username" [date]="createdAt"
//   [link]="['/profile', a.username]" />. With a link, the avatar and name
// lead to it; `avatarTestId` sets a data-testid on the avatar link. The avatar
// link repeats the name's, so it is skipped by the keyboard and screen readers
// when the name is shown.
@Component({
  selector: 'cdt-byline',
  imports: [DatePipe, RouterLink],
  template: `
    @if (link(); as link) {
      <a
        class="avatar-link"
        [routerLink]="link"
        [attr.data-testid]="avatarTestId() || null"
        [attr.tabindex]="name() ? -1 : null"
        [attr.aria-hidden]="name() ? 'true' : null"
      >
        <img class="avatar" [src]="image()" [alt]="name() ? '' : 'Profile'" />
      </a>
    } @else {
      <img class="avatar" [src]="image()" alt="" />
    }
    <span class="info">
      @if (name()) {
        @if (link(); as link) {
          <a class="author" [routerLink]="link">{{ name() }}</a>
        } @else {
          <span class="author">{{ name() }}</span>
        }
      }
      <span class="date">{{ date() | date: 'longDate' }}</span>
    </span>
  `,
  styleUrl: './byline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BylineComponent {
  readonly image = input.required<string>();
  readonly date = input.required<string | Date>();
  readonly name = input('');
  readonly link = input<unknown[] | null>(null);
  readonly avatarTestId = input('');
}
