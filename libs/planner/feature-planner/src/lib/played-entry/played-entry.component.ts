import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HitEntry, LogEntry } from '@everise/planner/data-access';
import { ActionNameComponent } from '../action-name/action-name.component';

const number = new Intl.NumberFormat('en');
const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 });

// One thing that happened to a player in the pull: a hit, what it did and
// what covered it; what they used (an attack too, quieter); their death.
@Component({
  selector: 'cdt-planner-played-entry',
  imports: [ActionNameComponent],
  templateUrl: './played-entry.component.html',
  styleUrls: ['../log-entries.scss', './played-entry.component.scss'],
  host: { '[class]': 'entry().kind', '[class.attack]': 'attack()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayedEntryComponent {
  readonly entry = input.required<LogEntry>();

  protected attack() {
    const entry = this.entry();
    return entry.kind === 'use' && !!entry.attack;
  }

  // "Took 40,000 of 100,000: 34% mitigated, 26,000 shielded. HP 88%."
  protected detail(hit: HitEntry) {
    const parts = [];
    if (hit.mitigated) parts.push(`${percent.format(hit.mitigated)} mitigated`);
    if (hit.absorbed) parts.push(`${number.format(hit.absorbed)} shielded`);
    if (hit.overkill) parts.push(`${number.format(hit.overkill)} past 0 HP`);
    const of = hit.unmitigated ? ` of ${number.format(hit.unmitigated)}` : '';
    const how = parts.length ? `: ${parts.join(', ')}` : '';
    const hp = hit.hpShare === null ? '' : ` HP ${percent.format(hit.hpShare)}.`;
    return `Took ${number.format(hit.amount)}${of}${how}.${hp}`;
  }
}
