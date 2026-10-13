import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MarketStore } from '@everise/market/data-access';
import { ChartLine, LineChartComponent, MessageComponent, PanelComponent } from '@everise/ui/components';
import { MarketControlsComponent } from '../market-controls/market-controls.component';
import { MarketItemPickerComponent } from '../market-item-picker/market-item-picker.component';

const longDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const day = (date: string) => Date.parse(`${date}T00:00:00Z`);

// The market board: up to three items' prices over time, a point a day (the
// middle price per unit), on a world or a whole data centre, from the sales
// Universalis keeps. Everything picked is in the query string
// (?items=5111,5057&scope=odin&from=2024-01-01), so a link shows the same
// chart. Open to everyone.
@Component({
  selector: 'cdt-market',
  templateUrl: './market.component.html',
  styleUrl: './market.component.scss',
  imports: [LineChartComponent, MarketControlsComponent, MarketItemPickerComponent, MessageComponent, PanelComponent],
  providers: [MarketStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketComponent {
  protected readonly store = inject(MarketStore);

  protected readonly lines = computed<ChartLine[]>(() =>
    this.store.series().map((series) => ({
      name: series.name,
      points: series.points.map((point) => ({
        at: point.at,
        value: point.value,
        detail: `${point.day.sales} sale${point.day.sales === 1 ? '' : 's'}, ${point.day.min.toLocaleString(
          'en',
        )}–${point.day.max.toLocaleString('en')}`,
      })),
    })),
  );
  protected readonly from = computed(() => day(this.store.range().from));
  protected readonly to = computed(() => day(this.store.range().to));

  // Where the history has got to while older days are still coming in.
  protected readonly status = computed(() =>
    this.store.reading()
      ? `Reading older sales from Universalis… back to ${longDay.format(day(this.store.start()))} so far.`
      : '',
  );
}
