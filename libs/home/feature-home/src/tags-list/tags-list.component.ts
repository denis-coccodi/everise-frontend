import { Component, ChangeDetectionStrategy, output, input } from '@angular/core';
import { TagDirective } from '@realworld/ui/components';

@Component({
  selector: 'cdt-tags-list',
  templateUrl: './tags-list.component.html',
  imports: [TagDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagsListComponent {
  tags = input<string[]>([]);
  setListTag = output<string>();
}
