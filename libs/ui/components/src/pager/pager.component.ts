import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

// Page numbers under a list: <cdt-pager [currentPage]="2" [totalPages]="[1, 2, 3]"
// (setPage)="..." />. A navigation landmark named by `label`, with a button per
// page; the current one is aria-current.
@Component({
  selector: 'cdt-pager',
  templateUrl: './pager.component.html',
  styleUrl: './pager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagerComponent {
  currentPage = input.required<number>();
  totalPages = input.required<number[]>();
  label = input('Pages');
  setPage = output<number>();
}
