import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LogEntry, PlanEntry, compareLog, pullClock } from '@everise/planner/data-access';
import { PlanEntryComponent } from '../plan-entry/plan-entry.component';
import { PlayedEntryComponent } from '../played-entry/played-entry.component';

// A player's pull as played and as planned, on one timeline: a row per
// moment, what happened then beside what the plan has then. Laptops and up
// show both sides; narrower screens the one `shown` (the pull view's tabs).
@Component({
  selector: 'cdt-planner-pull-compare',
  templateUrl: './pull-compare.component.html',
  styleUrl: './pull-compare.component.scss',
  imports: [PlanEntryComponent, PlayedEntryComponent],
  host: { '[class.show-plan]': "shown() === 'plan'", '[class.no-plan]': 'planned() === null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PullCompareComponent {
  readonly player = input.required<string>();
  readonly played = input.required<LogEntry[]>();
  // Null before the pull is planned.
  readonly planned = input.required<PlanEntry[] | null>();
  readonly shown = input<'played' | 'plan'>('played');

  protected readonly clock = pullClock;
  protected readonly rows = computed(() => compareLog(this.played(), this.planned() ?? []));
}
