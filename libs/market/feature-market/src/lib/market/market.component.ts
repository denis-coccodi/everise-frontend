import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MarketSearchStore, MarketStore, WorldDay, dayStart } from '@everise/market/data-access';
import { ChartLine, LineChartComponent, MessageComponent, PanelComponent } from '@everise/ui/components';
import { MarketControlsComponent } from '../market-controls/market-controls.component';
import { MarketItemPickerComponent } from '../market-item-picker/market-item-picker.component';
import { MarketWorldsComponent } from '../market-worlds/market-worlds.component';

const longDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const gil = new Intl.NumberFormat('en');
const DAY_MS = 86_400_000;

// Market History: an item's price over time on each world of a region (and
// Oceania's, when asked), a line per world, so a player sees where it sells
// for least: each day's middle price per unit, from the sales Universalis
// keeps, with the lowest today and in the days shown. Everything picked is
// in the query string (?item=5111&region=europe&worlds=odin,phoenix), so a
// link shows the same chart. For signed-in members (the route's guard).
@Component({
  selector: 'cdt-market',
  templateUrl: './market.component.html',
  styleUrl: './market.component.scss',
  imports: [
    LineChartComponent,
    MarketControlsComponent,
    MarketItemPickerComponent,
    MarketWorldsComponent,
    MessageComponent,
    PanelComponent,
  ],
  providers: [MarketStore, MarketSearchStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketComponent {
  protected readonly store = inject(MarketStore);
  protected readonly dayMs = DAY_MS;

  protected readonly lines = computed<ChartLine[]>(() =>
    this.store.series().map((series) => ({
      name: series.world.name,
      points: series.points.map((point) => ({ at: point.at, value: point.value, detail: detail(point.day) })),
    })),
  );
  protected readonly from = computed(() => dayStart(this.store.range().from));
  protected readonly to = computed(() => dayStart(this.store.range().to));
  protected readonly shown = computed(() => `${longDay.format(this.from())} to ${longDay.format(this.to())}`);

  // Where the history has got to while older days are still coming in.
  protected readonly status = computed(() =>
    this.store.reading() ? 'Reading older sales from Universalis… the chart fills in as they come.' : '',
  );

  protected price(day: WorldDay) {
    return `${gil.format(day.median)} gil`;
  }

  protected date(day: WorldDay) {
    return longDay.format(dayStart(day.day));
  }
}

// What the chart's cursor says about a day: its sales and price range.
function detail(day: { sales: number; min: number; max: number }) {
  return `${day.sales} sale${day.sales === 1 ? '' : 's'}, ${gil.format(day.min)}–${gil.format(day.max)}`;
}
