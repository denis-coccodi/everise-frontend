import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { TimelinePlayer } from '@everise/core/api-types';
import { PlanStore, PlannerStore, hpCurves, planLog, playerLog, pullClock } from '@everise/planner/data-access';
import {
  CheckboxComponent,
  MessageComponent,
  PanelComponent,
  TabComponent,
  TabsComponent,
} from '@everise/ui/components';
import { HpChartComponent } from '../hp-chart/hp-chart.component';
import { PlanFormComponent } from '../plan-form/plan-form.component';
import { PlanViewComponent } from '../plan-view/plan-view.component';
import { PullCompareComponent } from '../pull-compare/pull-compare.component';

// The pull picked: planning it for everyone (the margin and the button),
// then a tab per player, with the tick that replans them, as played (the
// hits they took, what covered each, the heals and mitigations they used)
// and as the plan has it, on one timeline. Laptops and up show both side by
// side; narrower screens one at a time, from the view tabs.
@Component({
  selector: 'cdt-planner-pull-view',
  templateUrl: './pull-view.component.html',
  styleUrl: './pull-view.component.scss',
  imports: [
    CheckboxComponent,
    HpChartComponent,
    MessageComponent,
    PanelComponent,
    PlanFormComponent,
    PlanViewComponent,
    PullCompareComponent,
    TabComponent,
    TabsComponent,
  ],
  // Focused when a pull is picked, so it takes its heading as its name.
  // A named group, not a landmark: the panel inside is already a region of
  // that name.
  host: { tabindex: '-1', role: 'group', '[attr.aria-label]': 'heading()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PullViewComponent {
  protected readonly store = inject(PlannerStore);
  protected readonly plans = inject(PlanStore);
  private readonly chosen = signal<number | null>(null);

  constructor() {
    // A pull just opened gets the plan's options: those last replanned
    // again, the invulnerabilities where the pull had them.
    effect(() => {
      const { pull, catalog, report, pullId } = this.store;
      const id = pullId();
      if (!id || !pull.hasValue() || !catalog.hasValue() || !report.hasValue()) return;
      const servers = new Map(report.value().players.map((p) => [p.id, p.server]));
      const players = pull.value().players.map((p) => ({ id: p.id, name: p.name, server: servers.get(p.id) ?? null }));
      const [timeline, actions] = [pull.value(), catalog.value()];
      untracked(() => void this.plans.prepare(id, timeline, actions, players));
    });
  }
  // On narrower screens: the pull as played, or the plan.
  protected readonly view = signal<'played' | 'plan'>('played');

  // "Vamp Fatale, 7:46".
  protected readonly heading = computed(() => {
    const picked = this.store.picked();
    return picked ? `${picked.name}, ${pullClock(picked.durationMs)}` : 'Pull';
  });
  protected readonly players = computed(() => (this.store.pull.hasValue() ? this.store.pull.value().players : []));
  // The player whose tab is open: the one chosen, or the first.
  protected readonly player = computed<TimelinePlayer | null>(() => {
    const players = this.players();
    return players.find((p) => p.id === this.chosen()) ?? players[0] ?? null;
  });
  protected readonly log = computed(() => {
    const player = this.player();
    const { pull, catalog } = this.store;
    if (!player || !pull.hasValue() || !catalog.hasValue()) return [];
    return playerLog(pull.value(), catalog.value(), player.id);
  });
  // The player's part of the plan, once the pull open is planned.
  // Everyone's HP over the pull, as played and with the plan once there's one.
  protected readonly curves = computed(() => {
    const plan = this.plans.pullId() === this.store.pullId() ? this.plans.plan() : null;
    return this.store.pull.hasValue() ? hpCurves(this.store.pull.value(), plan) : [];
  });
  protected readonly chartMargin = computed(() =>
    this.plans.pullId() === this.store.pullId() && this.plans.plan() ? this.plans.margin() / 100 : 0,
  );
  protected readonly planned = computed(() => {
    const player = this.player();
    const plan = this.plans.pullId() === this.store.pullId() ? this.plans.plan() : null;
    const { pull } = this.store;
    const { catalog } = this.store;
    return player && plan && pull.hasValue()
      ? planLog(plan, pull.value(), player.id, catalog.hasValue() ? catalog.value() : undefined)
      : null;
  });
  protected readonly loading = computed(() => this.store.pull.isLoading() || this.store.catalog.isLoading());
  protected readonly error = computed(() =>
    this.loading() ? '' : this.store.pullError() || this.store.catalogError(),
  );

  protected choose(playerId: number) {
    this.chosen.set(playerId);
  }
}
