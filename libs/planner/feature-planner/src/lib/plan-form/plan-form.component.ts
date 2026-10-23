import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, max, min, required } from '@angular/forms/signals';
import { InputErrorsComponent } from '@everise/core/forms';
import { MARGIN_RANGE, PlanStore, PlannerStore, unsafeHits } from '@everise/planner/data-access';
import { ButtonComponent, FieldComponent, InputComponent, MessageComponent } from '@everise/ui/components';

// Planning the pull open, for everyone: the HP margin to keep, who to
// replan (each player's tick is on their tab), and how the plan went.
@Component({
  selector: 'cdt-planner-plan-form',
  templateUrl: './plan-form.component.html',
  styleUrl: './plan-form.component.scss',
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
export class PlanFormComponent {
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

  private readonly playerIds = computed(() =>
    this.store.pull.hasValue() ? this.store.pull.value().players.map((p) => p.id) : [],
  );
  // The plan, when it's for the pull open.
  protected readonly current = computed(() => (this.plans.pullId() === this.store.pullId() ? this.plans.plan() : null));
  // How the plan went, for the party.
  protected readonly summary = computed(() => {
    const plan = this.current();
    if (!plan) return '';
    const margin = this.plans.margin();
    const short = unsafeHits(plan);
    const failed = plan.hits.filter((h) => h.avoidable).length;
    const avoided = failed
      ? ` ${failed} ${failed === 1 ? 'hit is a failed mechanic' : 'hits are failed mechanics'}, taken as avoided.`
      : '';
    if (!short)
      return `Every hit leaves at least ${margin}% of max HP, with ${plan.uses.length} mitigations, shields and heals.${avoided}`;
    return `${short} ${short === 1 ? 'hit leaves' : 'hits leave'} less than ${margin}% of max HP, even with everything those replanned have free.${avoided}`;
  });

  protected replanEveryone() {
    this.plans.replanOnly(this.playerIds());
  }

  private async run() {
    const { pull, catalog, pullId } = this.store;
    const id = pullId();
    if (!id || !pull.hasValue() || !catalog.hasValue() || !this.plans.replan().length) return;
    this.plans.setMargin(this.model().margin);
    await this.plans.run(id, pull.value(), catalog.value());
  }
}
