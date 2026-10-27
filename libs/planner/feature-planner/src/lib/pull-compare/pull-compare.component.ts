import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { LogEntry, PlanEntry, compareLog, pullClockTenths } from '@everise/planner/data-access';
import { PlanEntryComponent } from '../plan-entry/plan-entry.component';
import { PlayedEntryComponent } from '../played-entry/played-entry.component';

// A player's pull as played and as planned, on one timeline: a row per
// moment, what happened then beside what the plan has then. Laptops and up
// show both sides; narrower screens the one `shown` (the pull view's tabs).
// On laptops it scrolls on its own, in about two thirds of the screen, its
// headings kept in view; elsewhere the page scrolls, the headings still
// kept in view.
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

  protected readonly clock = pullClockTenths;
  protected readonly rows = computed(() => compareLog(this.played(), this.planned() ?? []));
  // The moment last opened from elsewhere (the HP chart), marked.
  protected readonly revealed = signal<number | null>(null);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // Scrolls to the first moment from `at` on (or the last one), and marks it.
  reveal(at: number) {
    const rows = this.rows();
    const row = rows.find((r) => r.at >= at) ?? rows.at(-1);
    if (!row) return;
    this.revealed.set(row.at);
    const element = this.host.nativeElement.querySelector(`tr[data-at="${row.at}"]`);
    element?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}
