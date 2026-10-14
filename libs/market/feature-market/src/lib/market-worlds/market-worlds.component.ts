import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MAX_WORLDS, MarketStore, MarketWorld } from '@everise/market/data-access';
import { ButtonComponent } from '@everise/ui/components';

// Which worlds' lines the chart draws: a button for each world of the
// region (and Oceania's, when asked), by data centre, pressed while drawn;
// at most MAX_WORLDS at once. Reads the page's MarketStore.
@Component({
  selector: 'cdt-market-worlds',
  templateUrl: './market-worlds.component.html',
  styleUrl: './market-worlds.component.scss',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketWorldsComponent {
  protected readonly store = inject(MarketStore);
  protected readonly max = MAX_WORLDS;

  // The worlds by data centre.
  protected readonly dataCentres = computed(() => {
    const groups = new Map<string, MarketWorld[]>();
    for (const world of this.store.allWorlds()) {
      groups.set(world.dataCentre, [...(groups.get(world.dataCentre) ?? []), world]);
    }
    return [...groups].map(([name, worlds]) => ({ name, worlds }));
  });
  protected readonly drawn = computed(() => new Set(this.store.chosen().map((world) => world.key)));
  protected readonly full = computed(() => this.drawn().size >= MAX_WORLDS);
}
