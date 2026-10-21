import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TimelinePlayer } from '@everise/core/api-types';
import { PlannerStore, playerLog, pullClock } from '@everise/planner/data-access';
import { MessageComponent, PanelComponent, TabComponent, TabsComponent } from '@everise/ui/components';
import { PlayerLogComponent } from '../player-log/player-log.component';

// The pull picked, a tab per player: the hits they took, what covered each,
// and the heals and mitigations they used, in time order.
@Component({
  selector: 'cdt-planner-pull-view',
  templateUrl: './pull-view.component.html',
  styleUrl: './pull-view.component.scss',
  imports: [MessageComponent, PanelComponent, PlayerLogComponent, TabComponent, TabsComponent],
  // Focused when a pull is picked, so it takes its heading as its name.
  host: { tabindex: '-1', role: 'region', '[attr.aria-label]': 'heading()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PullViewComponent {
  protected readonly store = inject(PlannerStore);
  private readonly chosen = signal<number | null>(null);

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
  protected readonly loading = computed(() => this.store.pull.isLoading() || this.store.catalog.isLoading());
  protected readonly error = computed(() =>
    this.loading() ? '' : this.store.pullError() || this.store.catalogError(),
  );

  protected choose(playerId: number) {
    this.chosen.set(playerId);
  }
}
