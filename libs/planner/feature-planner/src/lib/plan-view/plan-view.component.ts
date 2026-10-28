import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TimelinePlayer } from '@everise/core/api-types';
import { InvulnerabilitySetting, PlanStore, PlannerStore, pullClock, unsafeHits } from '@everise/planner/data-access';
import { OPENERS, type OpenerId } from '@everise/planner/scheduler';
import { FieldComponent, InputComponent, MessageComponent } from '@everise/ui/components';

// One of a tank's invulnerabilities in the form: a choice the plan has
// (`index` in the options' list), or none yet.
interface InvulnerabilityRow {
  key: string;
  action: number;
  name: string;
  index: number | null;
  setting: InvulnerabilitySetting;
}

// The player's own part of planning, in their tab: what a replanned healer
// favours, damage or healing; a replanned tank's invulnerabilities; and how
// the plan went for them (their part of it is in the pull view's timeline). The margin and the button are the plan form's,
// above the tabs.
@Component({
  selector: 'cdt-planner-plan-view',
  templateUrl: './plan-view.component.html',
  styleUrl: './plan-view.component.scss',
  imports: [FieldComponent, InputComponent, MessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanViewComponent {
  readonly player = input.required<TimelinePlayer>();
  private readonly store = inject(PlannerStore);
  protected readonly plans = inject(PlanStore);
  protected readonly clock = pullClock;

  protected readonly replanned = computed(() => this.plans.replan().includes(this.player().id));
  // The openers the player's job has (none for most), and the one chosen:
  // the standard one unless set otherwise.
  protected readonly openers = computed(() => OPENERS[this.player().job ?? ''] ?? []);
  protected readonly opener = computed<OpenerId>(() => this.plans.openers()[this.player().id] ?? 'standard');
  protected readonly openerHint = computed(() => {
    const chosen = this.openers().find((o) => o.id === this.opener());
    return chosen?.source
      ? `${chosen.name}, from ${chosen.source}: the pull starts with it, and the plan follows on from it.`
      : 'No opener: the plan places everything itself from the pull.';
  });
  // What a replanned healer favours: damage unless set to healing.
  protected readonly favour = computed(() => this.plans.favour()[this.player().id] ?? 'dps');
  // A replanned astrologian's other Lightspeed charge: as played by default.
  protected readonly lightspeed = computed(() => this.plans.lightspeed()[this.player().id] ?? 'logged');
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
  private readonly current = computed(() => (this.plans.pullId() === this.store.pullId() ? this.plans.plan() : null));
  // How the plan went for this player.
  protected readonly summary = computed(() => {
    const plan = this.current();
    if (!plan) return '';
    const short = unsafeHits(plan, this.player().id);
    const { name } = this.player();
    if (!short) return `Every hit on ${name} leaves at least ${this.plans.margin()}% of their max HP.`;
    return `${short} ${short === 1 ? 'hit' : 'hits'} on ${name} ${short === 1 ? 'leaves' : 'leave'} less than ${this.plans.margin()}% of their max HP.`;
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

  // Where the plan wanted a heal of this player's they hadn't the MP for.
  protected readonly mpShort = computed(() => {
    const times = (this.current()?.mpShort ?? [])
      .filter((s) => s.player === this.player().id)
      .map((s) => pullClock(s.at));
    if (!times.length) return '';
    return `Short on MP at ${times.join(', ')}: the plan couldn't afford a heal there.`;
  });
  // A Dark Knight's Edges of Shadow as played the plan drops for MP.
  protected readonly dropped = computed(() => {
    const times = this.current()?.mp?.find((m) => m.player === this.player().id)?.dropped ?? [];
    if (!times.length) return '';
    return `The plan drops the Edge of Shadow at ${times.map(pullClock).join(', ')} for The Blackest Night's MP.`;
  });

  protected setOpener(value: string) {
    const opener = this.openers().find((o) => o.id === value);
    if (opener) this.plans.setOpener(this.player().id, opener.id);
  }

  protected setLightspeed(value: string) {
    this.plans.setLightspeed(this.player().id, value === 'replan' ? 'replan' : 'logged');
  }

  protected setFavour(value: string) {
    this.plans.setFavour(this.player().id, value === 'healing' ? 'healing' : 'dps');
  }

  protected setInvulnerability(row: InvulnerabilityRow, value: string) {
    const setting: InvulnerabilitySetting = value === 'never' || value === 'planner' ? value : Number(value);
    this.plans.setInvulnerability(this.player().id, row.action, row.index, setting);
  }
}
