import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// A content card with an optional footer strip:
// <cdt-card><p>Body</p><div cdtCardFooter>Footer</div></cdt-card>.
// `flush` drops the body's padding, for content that fills the card (a
// borderless text area). `stretch` makes the card as tall as the space it's
// in (cards side by side in a grid end level) and lays its content out in a
// column, so content can keep to the bottom (margin-top: auto).
@Component({
  selector: 'cdt-card',
  template: `
    <div class="body" [class.flush]="flush()"><ng-content /></div>
    <div class="footer"><ng-content select="[cdtCardFooter]" /></div>
  `,
  styleUrl: './card.component.scss',
  host: { '[class.stretch]': 'stretch()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  readonly flush = input(false);
  readonly stretch = input(false);
}
