import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlanEntry, PlanHitEntry } from '@everise/planner/data-access';
import { ActionNameComponent } from '../action-name/action-name.component';

const number = new Intl.NumberFormat('en');
const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 });

// One thing in a player's part of the plan: what to use, or how a hit lands
// with the plan's mitigations, shields and heals, against how it went.
@Component({
  selector: 'cdt-planner-plan-entry',
  imports: [ActionNameComponent],
  templateUrl: './plan-entry.component.html',
  styleUrls: ['../log-entries.scss', './plan-entry.component.scss'],
  host: {
    '[class]': 'entry().kind',
    '[class.unsafe]': "entry().kind === 'hit' && !safe()",
    '[class.attack]': 'attack()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanEntryComponent {
  readonly entry = input.required<PlanEntry>();

  protected attack() {
    const entry = this.entry();
    return entry.kind === 'use' && !!entry.attack;
  }

  protected safe() {
    const entry = this.entry();
    return entry.kind !== 'hit' || entry.safe;
  }

  // What the plan has up for a hit.
  protected covered(hit: PlanHitEntry) {
    if (hit.avoidable) return 'Not planned for: the plan takes it as avoided';
    const failed = hit.failed ? 'A failed mechanic, planned for anyway. ' : '';
    if (hit.covers.length) return `${failed}Covered by ${hit.covers.join(', ')}`;
    return failed + (hit.safe ? 'No mitigation needed' : 'No mitigation, shield or heal was free for it');
  }

  // "Takes 40,000 of 100,000 (45% of max HP), 20,000 shielded; at 90% HP,
  // leaves 45%; took 52,000 as played."
  protected detail(hit: PlanHitEntry) {
    if (hit.avoidable) {
      return `A failed mechanic: ${number.format(hit.unmitigated)} before mitigation, more than their HP; took ${number.format(hit.asPlayed)} as played.`;
    }
    const share = hit.share === null ? '' : ` (${percent.format(hit.share)} of max HP)`;
    const shielded = hit.absorbed ? `, ${number.format(hit.absorbed)} shielded` : '';
    const taken = `Takes ${number.format(hit.planned)} of ${number.format(hit.unmitigated)}${share}${shielded}`;
    const hp =
      hit.before === null || hit.after === null
        ? ''
        : `; at ${percent.format(hit.before)} HP, leaves ${percent.format(hit.after)}`;
    // Blocked by an invulnerability as played: the attack's usual damage.
    const estimated = hit.estimated ? ' (estimated: an invulnerability blocked it)' : '';
    return `${taken}${hp}; took ${number.format(hit.asPlayed)} as played${estimated}.`;
  }
}
