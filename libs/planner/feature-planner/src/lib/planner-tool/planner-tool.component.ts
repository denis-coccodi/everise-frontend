import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { PlanStore, PlannerStore } from '@everise/planner/data-access';
import { PanelComponent } from '@everise/ui/components';
import { PullListComponent } from '../pull-list/pull-list.component';
import { PullViewComponent } from '../pull-view/pull-view.component';
import { ReportFormComponent } from '../report-form/report-form.component';

// The planner for signed-in members: the report link, the report's pulls,
// and the pull picked. What's open is in the query string
// (?report=<code>&pull=<id>), so a link opens the same.
@Component({
  selector: 'cdt-planner-tool',
  templateUrl: './planner-tool.component.html',
  styleUrl: './planner-tool.component.scss',
  imports: [PanelComponent, PullListComponent, PullViewComponent, ReportFormComponent],
  providers: [PlannerStore, PlanStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerToolComponent {
  protected readonly store = inject(PlannerStore);
  private readonly pullView = viewChild(PullViewComponent, { read: ElementRef<HTMLElement> });
  // The pull just picked, whose view gets the focus once it's shown: a
  // long report's pulls would otherwise stand between the person and it.
  private readonly focusPull = signal<number | null>(null);

  constructor() {
    effect(() => {
      const view = this.pullView();
      const wanted = this.focusPull();
      if (!view || wanted === null || this.store.pullId() !== wanted) return;
      untracked(() => {
        view.nativeElement.focus();
        this.focusPull.set(null);
      });
    });
  }

  protected picked(pullId: number) {
    this.focusPull.set(pullId);
  }
}
