import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, max, min, required } from '@angular/forms/signals';
import { InputErrorsComponent } from '@everise/core/forms';
import { MARGIN_RANGE, PlanStore, PlannerStore, pullClock, unsafeHits } from '@everise/planner/data-access';
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
    const wipes = new Set(plan.mechanics.filter((m) => m.wipe).map((m) => m.id));
    const failed = plan.hits.filter((h) => h.avoidable && !wipes.has(h.mechanic)).length;
    const covered = plan.mechanics.flatMap((m) => m.hits).filter((h) => h.failed && !h.avoidable).length;
    const wiped = plan.mechanics
      .filter((m) => m.wipe)
      .map((m) => `${m.name} at ${pullClock(m.at)}`)
      .filter((x, i, all) => all.indexOf(x) === i);
    const avoided =
      (wiped.length
        ? ` Left out, as nothing saves anyone from ${wiped.length === 1 ? 'it' : 'them'}: ${wiped.join(', ')}.`
        : '') +
      (failed
        ? ` ${failed} ${failed === 1 ? 'hit is a failed mechanic' : 'hits are failed mechanics'}, taken as avoided.`
        : '') +
      (covered ? ` ${covered} failed ${covered === 1 ? 'mechanic is' : 'mechanics are'} planned for anyway.` : '');
    // Planned again with nothing changed: said, as the plan shown stays the same.
    const again = this.plans.sameAsBefore()
      ? 'Planned again: nothing changed, as each edit already updates the plan (the Plan column, and the Plan line on the HP chart). '
      : '';
    if (!short)
      return (
        again +
        `Every hit leaves at least ${margin}% of max HP, with ${plan.uses.length} mitigations, shields and heals.${avoided}`
      );
    return (
      again +
      `${short} ${short === 1 ? 'hit leaves' : 'hits leave'} less than ${margin}% of max HP, even with everything those replanned have free.${avoided}`
    );
  });

  protected setFailedMechanics(value: string) {
    this.plans.setFailedMechanics(value === 'ignore' ? 'ignore' : 'cover');
  }

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
