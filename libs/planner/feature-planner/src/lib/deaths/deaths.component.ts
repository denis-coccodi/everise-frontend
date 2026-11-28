import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DeathCause, PlannerStore, PlayedDeath, playedDeaths, pullClock } from '@everise/planner/data-access';
import { readFold, saveFold } from '../fold-state';

// The pull's deaths as they were played, before any replanning: when each
// player died, to what, why, and who is to blame. A section that folds away
// under its heading, as the timeline and the HP chart do.
@Component({
  selector: 'cdt-planner-deaths',
  templateUrl: './deaths.component.html',
  styleUrls: ['../fold.scss', './deaths.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeathsComponent {
  private readonly store = inject(PlannerStore);
  protected readonly open = signal(readFold(FOLD_KEY));

  protected readonly deaths = computed<PlayedDeath[]>(() => {
    const { pull, catalog } = this.store;
    return pull.hasValue() && catalog.hasValue() ? playedDeaths(pull.value(), catalog.value()) : [];
  });
  private readonly names = computed(
    () =>
      new Map(
        (this.store.pull.hasValue() ? this.store.pull.value().players : []).map((p) => [
          p.id,
          `${p.name}${p.job ? ` (${p.job})` : ''}`,
        ]),
      ),
  );
  // Who was blamed how often, most first: deaths in a wipe already under way
  // only repeat the blame of the one that started it, so they don't count.
  protected readonly tally = computed(() => {
    const counts = new Map<number, number>();
    for (const d of this.deaths()) {
      if (d.cause === 'cascade') continue;
      for (const p of d.blame) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return [...counts]
      .sort((a, b) => b[1] - a[1])
      .map(([p, n]) => `${this.name(p)} ${n}`)
      .join(', ');
  });

  protected readonly causes = CAUSES;
  protected readonly clock = pullClock;

  protected name(id: number) {
    return this.names().get(id) ?? 'someone';
  }

  protected blameOf(death: PlayedDeath) {
    if (death.blame.length) return death.blame.map((p) => this.name(p)).join(', ');
    return death.cause === 'wipe' ? 'Nobody: the boss wasn’t killed in time' : 'Nobody the log can name';
  }

  protected toggle() {
    this.open.update((o) => !o);
    saveFold(FOLD_KEY, this.open());
  }
}

// Where the browser keeps whether the section was left open.
const FOLD_KEY = 'planner.deaths';

// Each cause in a word or two, for the list.
const CAUSES: Record<DeathCause, string> = {
  failed: 'Failed the mechanic',
  missedShare: 'Others missed a share',
  earlierMistake: 'Earlier mistake',
  shortfall: 'Not enough HP or mitigation',
  wipe: 'Enrage',
  cascade: 'Wipe under way',
  unknown: 'Unknown',
};
