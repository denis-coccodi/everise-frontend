import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// A themed tag pill on a link, button, list item or span:
// <button type="button" cdtTag (click)="...">raids</button> to pick a tag, or
// <li cdtTag="outline">raids</li> for the quieter outlined version.
@Component({
  selector: '[cdtTag]',
  template: '<ng-content />',
  styleUrl: './tag.component.scss',
  host: { '[attr.data-variant]': "cdtTag() || 'filled'" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagComponent {
  readonly cdtTag = input<'outline' | ''>('');
}
