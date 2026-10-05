import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

// A roulette result, styled after the game's "Duty Found" window: the duty's
// banner, its type, name and details, and the party settings.
//
//   <cdt-duty-card type="Dungeons" name="Sastasha" detail="Lv. 15 · A Realm Reborn"
//                  mode="Regular" [image]="bannerUrl" />
//
// `jobName` and `jobIcon` show the job dealt by dealer's choice, `unknown`
// marks a duty the game picks (a duty roulette), and `compact` makes a smaller
// card for lists. Content with `cdtDutyCardLinks` goes under the details;
// other content goes in the party settings box.
@Component({
  selector: 'cdt-duty-card',
  templateUrl: './duty-card.component.html',
  styleUrl: './duty-card.component.scss',
  host: { '[class.compact]': 'compact()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DutyCardComponent {
  readonly type = input.required<string>();
  readonly name = input.required<string>();
  readonly detail = input('');
  readonly mode = input.required<string>();
  readonly image = input<string | undefined>();
  readonly unknown = input(false, { transform: booleanAttribute });
  readonly jobName = input<string | undefined>();
  readonly jobIcon = input<string | undefined>();
  readonly compact = input(false, { transform: booleanAttribute });

  // An image the server doesn't have is left out.
  protected hideImage(event: Event) {
    (event.target as HTMLElement).hidden = true;
  }
}
