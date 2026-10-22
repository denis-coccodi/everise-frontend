import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormField, FormRoot, form, max, min, required } from '@angular/forms/signals';
import { TimelinePlayer } from '@everise/core/api-types';
import { InputErrorsComponent } from '@everise/core/forms';
import { MARGIN_RANGE, PlanStore, PlannerStore, unsafeHits } from '@everise/planner/data-access';
import { ButtonComponent, FieldComponent, InputComponent, MessageComponent } from '@everise/ui/components';

// Planning the pull open: the HP margin to keep, and how the plan went for
// the party and for the player (their part of it is in the pull view's
// timeline).
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
