import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormField, FormRoot, form, max, min, required } from '@angular/forms/signals';
import { TimelinePlayer } from '@everise/core/api-types';
import { InputErrorsComponent } from '@everise/core/forms';
import {
  InvulnerabilitySetting,
  MARGIN_RANGE,
  PlanPlayer,
  PlanStore,
  PlannerStore,
  characterKey,
  pullClock,
  unsafeHits,
} from '@everise/planner/data-access';
import {
  ButtonComponent,
  CheckboxComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
} from '@everise/ui/components';

// One of a tank's invulnerabilities in the form: a choice the plan has
// (`index` in the options' list), or none yet.
interface InvulnerabilityRow {
  key: string;
  action: number;
  name: string;
  index: number | null;
  setting: InvulnerabilitySetting;
}

// Planning the pull open, from the player's tab: the HP margin to keep
// (for everyone), whether this player is replanned or kept as played,
// whether they're the member's own character, a tank's invulnerabilities,
// and how the plan went for the party and for the player (their part of it
// is in the pull view's timeline).
@Component({
  selector: 'cdt-planner-plan-view',
  templateUrl: './plan-view.component.html',
  styleUrl: './plan-view.component.scss',
  imports: [
    ButtonComponent,
    CheckboxComponent,
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
  protected readonly clock = pullClock;

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

  // The player as the report has them (with their server).
  private readonly planPlayer = computed<PlanPlayer>(() => {
    const { id, name } = this.player();
    const report = this.store.report.hasValue() ? this.store.report.value() : null;
    return { id, name, server: report?.players.find((p) => p.id === id)?.server ?? null };
  });
  protected readonly replanned = computed(() => this.plans.replan().includes(this.player().id));
  protected readonly mine = computed(() => this.plans.me() === characterKey(this.planPlayer()));
  // The tank's invulnerabilities: each choice the plan has, and one row for
  // each with none.
  protected readonly invulnerabilities = computed<InvulnerabilityRow[]>(() => {
    const options = this.plans.invulnerabilityOptions();
    const id = this.player().id;
    const rows: InvulnerabilityRow[] = [];
    for (const tool of options?.tools.filter((t) => t.player === id) ?? []) {
      const choices = this.plans
        .invulnerabilities()
        .map((choice, index) => ({ choice, index }))
        .filter(({ choice }) => choice.player === id && choice.action === tool.action);
      for (const { choice, index } of choices) {
        const setting = choice.mechanic === null ? 'never' : choice.mechanic;
        rows.push({ key: `${tool.action}:${index}`, action: tool.action, name: tool.name, index, setting });
      }
      if (!choices.length) {
        rows.push({ key: `${tool.action}:new`, action: tool.action, name: tool.name, index: null, setting: 'planner' });
      }
    }
    return rows;
  });
  // The mechanics that hit this player, to put an invulnerability on.
  protected readonly mechanics = computed(
    () => this.plans.invulnerabilityOptions()?.mechanics.filter((m) => m.players.includes(this.player().id)) ?? [],
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
    return `${party} ${party === 1 ? 'hit leaves' : 'hits leave'} less than ${margin}% of max HP, even with everything those replanned have free (${mine} of them on ${this.player().name}).`;
  });
  // This player's invulnerabilities the plan couldn't use where asked.
  protected readonly unplaced = computed(() => {
    const plan = this.current();
    const options = this.plans.invulnerabilityOptions();
    if (!plan || !options) return '';
    const names = plan.unplaced
      .filter((c) => c.player === this.player().id && c.mechanic !== null)
      .map((c) => {
        const tool =
          options.tools.find((t) => t.player === c.player && t.action === c.action)?.name ?? 'An invulnerability';
        const m = options.mechanics.find((o) => o.id === c.mechanic);
        return `${tool} at ${m ? `${pullClock(m.at)} ${m.name}` : 'that mechanic'}`;
      });
    return names.length ? `The plan couldn't use ${names.join(', ')}: the recast doesn't allow it.` : '';
  });

  protected setMine(mine: boolean) {
    this.plans.setMe(this.planPlayer(), mine);
  }

  protected replanEveryone() {
    this.plans.replanOnly(this.store.pull.hasValue() ? this.store.pull.value().players.map((p) => p.id) : []);
  }

  protected setInvulnerability(row: InvulnerabilityRow, value: string) {
    const setting: InvulnerabilitySetting = value === 'never' || value === 'planner' ? value : Number(value);
    this.plans.setInvulnerability(this.player().id, row.action, row.index, setting);
  }

  private async run() {
    const { pull, catalog, pullId } = this.store;
    const id = pullId();
    if (!id || !pull.hasValue() || !catalog.hasValue() || !this.plans.replan().length) return;
    this.plans.setMargin(this.model().margin);
    await this.plans.run(id, pull.value(), catalog.value());
  }
}
