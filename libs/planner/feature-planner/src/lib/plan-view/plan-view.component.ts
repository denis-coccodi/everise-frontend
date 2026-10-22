import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormField, FormRoot, form, max, min, required } from '@angular/forms/signals';
import { TimelinePlayer } from '@everise/core/api-types';
import { InputErrorsComponent } from '@everise/core/forms';
import { MARGIN_RANGE, PlanStore, PlannerStore, planLog, unsafeHits } from '@everise/planner/data-access';
import { ButtonComponent, FieldComponent, InputComponent, MessageComponent } from '@everise/ui/components';
import { PlanLogComponent } from '../plan-log/plan-log.component';

// The plan for the pull open: the HP margin to keep, planning it, how it
// went for the party, and the player's part of it.
@Component({
  selector: 'cdt-planner-plan-view',
  templateUrl: './plan-view.component.html',
  styleUrl: './plan-view.component.scss',
  imports: [
    ButtonComponent,
    FieldComponent,
    FormField,
    FormRoot,
    InputComponent,
    InputErrorsComponent,
    MessageComponent,
    PlanLogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanViewComponent {
  readonly player = input.required<TimelinePlayer>();
  private readonly store = inject(PlannerStore);
  protected readonly plans = inject(PlanStore);

  private readonly model = signal({ margin: this.plans.margin() });
  protected readonly form = form(
    this.model,
    (path) => {
      required(path.margin);
      min(path.margin, MARGIN_RANGE.min);
      max(path.margin, MARGIN_RANGE.max);
    },
    { submission: { action: async () => this.run() } },
  );

  // The plan, when it's for the pull open.
  protected readonly current = computed(() => (this.plans.pullId() === this.store.pullId() ? this.plans.plan() : null));
  protected readonly log = computed(() => {
    const plan = this.current();
    const pull = this.store.pull;
    return plan && pull.hasValue() ? planLog(plan, pull.value(), this.player().id) : [];
  });
  // How the plan went: for the party, then for this player.
  protected readonly summary = computed(() => {
    const plan = this.current();
    if (!plan) return '';
    const margin = this.plans.margin();
    const party = unsafeHits(plan);
    const mine = unsafeHits(plan, this.player().id);
    if (!party)
      return `Every hit leaves at least ${margin}% of max HP, with ${plan.uses.length} mitigations, shields and heals.`;
    return `${party} ${party === 1 ? 'hit leaves' : 'hits leave'} less than ${margin}% of max HP even with every mitigation, shield and heal the party has free (${mine} of them on ${this.player().name}).`;
  });

  private async run() {
    const { pull, catalog, pullId } = this.store;
    const id = pullId();
    if (!id || !pull.hasValue() || !catalog.hasValue()) return;
    this.plans.setMargin(this.model().margin);
    await this.plans.run(id, pull.value(), catalog.value());
  }
}
