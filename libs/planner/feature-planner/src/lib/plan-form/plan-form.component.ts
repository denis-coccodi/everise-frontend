import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, max, min, required } from '@angular/forms/signals';
import { InputErrorsComponent } from '@everise/core/forms';
import { MARGIN_RANGE, PlanStore, PlannerStore, deathsText, pullClock, unsafeHits } from '@everise/planner/data-access';
import { ButtonComponent, FieldComponent, InputComponent, MessageComponent } from '@everise/ui/components';
import { PlanExportComponent } from '../plan-export/plan-export.component';

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
    PlanExportComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanFormComponent {
  protected readonly store = inject(PlannerStore);
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
      .map((m) => `${m.name} at ${pullClock(m.at)}${m.wipe === 'maybe' ? ' (may be an enrage)' : ''}`)
      .filter((x, i, all) => all.indexOf(x) === i);
    const avoided =
      (wiped.length
        ? ` Left out as ${wiped.length === 1 ? 'an enrage' : 'enrages'}, nothing saves anyone from ${wiped.length === 1 ? 'it' : 'them'}: ${wiped.join(', ')}.`
        : '') +
      (failed
        ? ` ${failed} ${failed === 1 ? 'hit is a failed mechanic' : 'hits are failed mechanics'}, taken as avoided.`
        : '') +
      (covered ? ` ${covered} failed ${covered === 1 ? 'mechanic is' : 'mechanics are'} planned for anyway.` : '') +
      deathsText(plan, this.store.pull.hasValue() ? this.store.pull.value().players : []) +
      this.restOfFight();
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

  // A completed wipe's plan: where the part nobody here played starts.
  private restOfFight() {
    const from = this.store.planned()?.completion?.from;
    const c = this.completion();
    if (from === undefined || c?.state !== 'offered') return '';
    const whose =
      c.source === 'report' ? `pull ${c.timeline.completion?.clear.pullId} of this report` : "another group's kill";
    return ` From ${pullClock(from)} on, it's the rest of the fight as ${whose} had it (shaded in the timeline and on the HP chart).`;
  }

  // For a wipe: whether its plan can cover the whole fight, in words.
  protected readonly completion = this.store.completion;
  protected readonly completionHint = computed(() => {
    const c = this.completion();
    if (c?.state !== 'offered') return '';
    const reached = `This wipe got through ${c.reached} of ${mechanics(c)}. Completed, the rest of the fight is `;
    // Where its enrages (left out of the plan) are told from.
    const enrages = c.timeline.script
      ? " Enrages come from the fight's cactbot timeline."
      : c.source === 'report'
        ? ' There is no cactbot timeline of this fight yet: an enrage is only guessed from how hard it hit.'
        : " There is no cactbot timeline of this fight yet: enrages are told from what the kills don't have.";
    if (c.source === 'report')
      return `${reached}taken from pull ${c.timeline.completion?.clear.pullId} of this report, which got further, lined up on the boss's casts.${enrages}`;
    const read = c.timeline.clears?.length ?? 1;
    return (
      reached +
      `taken from another group's kill (of ${read} read), lined up on the boss's casts, and so is its damage. ` +
      `Players with nobody of their job in that kill are planned from the wipe on.${enrages}`
    );
  });
  protected readonly completionNote = computed(() => {
    const c = this.completion();
    switch (c?.state) {
      case 'reading':
        return "Reading other groups' kills of this fight…";
      case 'none':
        return (
          "Only what was logged is planned: no other group's kill of this fight could be read (FFLogs has none, " +
          'or has archived them), and no pull of this report got further.'
        );
      case 'unaligned':
        return "Only what was logged is planned: no other group's kill, or further pull of this report, lines up with this wipe's boss casts.";
      case 'nothing-left':
        return c.source === 'report'
          ? "Only what was logged is planned: no pull of this report got further, and FFLogs has no other group's kill of this fight."
          : "Only what was logged is planned: this wipe got through every mechanic other groups' kills have, so they have nothing left to add.";
      default:
        return '';
    }
  });

  protected setFailedMechanics(value: string) {
    this.plans.setFailedMechanics(value === 'ignore' ? 'ignore' : 'cover');
  }

  protected setCompleteWipe(value: string) {
    this.store.setCompleteWipe(value === 'whole');
  }

  protected replanEveryone() {
    this.plans.replanOnly(this.playerIds());
  }

  private async run() {
    const { planned, catalog, pullId } = this.store;
    const [id, timeline] = [pullId(), planned()];
    if (!id || !timeline || !catalog.hasValue() || !this.plans.replan().length) return;
    this.plans.setMargin(this.model().margin);
    await this.plans.run(id, timeline, catalog.value());
  }
}

// "the fight's 38 mechanics", or as far as the report's furthest pull got.
function mechanics(c: { source: 'kills' | 'report'; total: number }) {
  return c.source === 'report'
    ? `the ${c.total} mechanics this report's furthest pull reached`
    : `the fight's ${c.total} mechanics`;
}
