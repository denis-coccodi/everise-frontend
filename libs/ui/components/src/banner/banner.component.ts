import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

// The full-width title strip at the top of a page:
// <cdt-banner><h1>everise</h1><p>...</p></cdt-banner>. The content sits in
// the page-width container (`narrow`: the reading width); pages style their
// own headings inside it.
@Component({
  selector: 'cdt-banner',
  template: '<div class="container" [class.narrow]="narrow()"><ng-content /></div>',
  styleUrl: './banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerComponent {
  readonly narrow = input(false, { transform: booleanAttribute });
}
