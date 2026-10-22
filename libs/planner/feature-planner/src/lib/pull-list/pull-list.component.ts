import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { ReportPull } from '@everise/core/api-types';
import { PlannerStore, pullClock } from '@everise/planner/data-access';
import { ButtonComponent, MessageComponent } from '@everise/ui/components';

const KINDS: Record<ReportPull['kind'], string> = { extreme: 'Extreme', savage: 'Savage', ultimate: 'Ultimate' };

// The report's Extreme, Savage and Ultimate pulls, a group per fight, to
// pick one.
@Component({
  selector: 'cdt-planner-pull-list',
  templateUrl: './pull-list.component.html',
  styleUrl: './pull-list.component.scss',
  imports: [ButtonComponent, MessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PullListComponent {
  protected readonly store = inject(PlannerStore);
  protected readonly kinds = KINDS;
  // A pull the person picked (not one opened by a link).
  readonly picked = output<number>();
  protected readonly report = computed(() => (this.store.report.hasValue() ? this.store.report.value() : null));

  protected pick(pullId: number) {
    this.store.pick(pullId);
    this.picked.emit(pullId);
  }

  // "Kill, 7:46" or "Wipe at 23.46%, 5:00" (the whole fight's share left,
  // phases included, for Ultimates).
  protected outcome(pull: ReportPull) {
    const left = pull.fightLeft ?? pull.bossHpLeft;
    const result = pull.kill ? 'Kill' : left === null ? 'Wipe' : `Wipe at ${left}%`;
    const phase = pull.phase && !pull.kill ? `, phase ${pull.phase}` : '';
    return `${result}${phase}, ${pullClock(pull.durationMs)}`;
  }
}
