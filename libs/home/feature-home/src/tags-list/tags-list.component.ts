import { Component, ChangeDetectionStrategy, output, input } from '@angular/core';
import { TagComponent } from '@everise/ui/components';

@Component({
  selector: 'cdt-tags-list',
  templateUrl: './tags-list.component.html',
  styleUrl: './tags-list.component.scss',
  imports: [TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagsListComponent {
  tags = input<string[]>([]);
  setListTag = output<string>();
}
