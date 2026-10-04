import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// A content card with an optional footer strip:
// <cdt-card><p>Body</p><div cdtCardFooter>Footer</div></cdt-card>.
// `flush` drops the body's padding, for content that fills the card (a
// borderless text area).
@Component({
  selector: 'cdt-card',
  template: `
    <div class="body" [class.flush]="flush()"><ng-content /></div>
    <div class="footer"><ng-content select="[cdtCardFooter]" /></div>
  `,
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  readonly flush = input(false);
}
