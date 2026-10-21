import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlanEntry, PlanHitEntry, pullClock } from '@everise/planner/data-access';

const number = new Intl.NumberFormat('en');
const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 });

// One player's part of the plan, in time order: what to use when, and how
// each hit lands with the plan's mitigations up, against how it went.
@Component({
  selector: 'cdt-planner-plan-log',
  templateUrl: './plan-log.component.html',
  styleUrls: ['../log-entries.scss', './plan-log.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanLogComponent {
  readonly entries = input.required<PlanEntry[]>();
  protected readonly clock = pullClock;

  // What the plan has up for a hit.
  protected covered(hit: PlanHitEntry) {
    if (hit.covers.length) return `Covered by ${hit.covers.join(', ')}`;
    return hit.safe ? 'No mitigation needed' : 'No mitigation was free for it';
  }

  // "Takes 40,000 of 100,000 (45% of max HP); took 52,000 as played."
  protected detail(hit: PlanHitEntry) {
    const share = hit.share === null ? '' : ` (${percent.format(hit.share)} of max HP)`;
    return `Takes ${number.format(hit.planned)} of ${number.format(hit.unmitigated)}${share}; took ${number.format(
      hit.asPlayed,
    )} as played.`;
  }
}
