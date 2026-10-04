import { NgClass } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'cdt-pager',
  templateUrl: './pager.component.html',
  styleUrl: './pager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
})
export class PagerComponent {
  currentPage = input.required<number>();
  totalPages = input.required<number[]>();
  setPage = output<number>();
}
