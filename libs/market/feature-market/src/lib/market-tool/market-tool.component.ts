import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  MarketListingsStore,
  MarketSearchStore,
  MarketStore,
  WorldDay,
  WorldListing,
  dayStart,
} from '@everise/market/data-access';
import { ChartLine, LineChartComponent, MessageComponent, PanelComponent } from '@everise/ui/components';
import { MarketControlsComponent } from '../market-controls/market-controls.component';
import { MarketItemPickerComponent } from '../market-item-picker/market-item-picker.component';
import { MarketWorldsComponent } from '../market-worlds/market-worlds.component';

const longDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const gil = new Intl.NumberFormat('en');

// The market history tool, for signed-in members: an item's price over time
// on each world of a region (and Oceania's, when asked), a line per world,
// with the cheapest listings now and the lowest median sale price today and in
// the days shown. Everything picked is in the query string
// (?item=5111&region=europe&worlds=odin,phoenix), so a link shows the same
// chart.
@Component({
  selector: 'cdt-market-tool',
  templateUrl: './market-tool.component.html',
  styleUrl: './market-tool.component.scss',
  imports: [
    LineChartComponent,
    MarketControlsComponent,
    MarketItemPickerComponent,
    MarketWorldsComponent,
    MessageComponent,
    PanelComponent,
  ],
  providers: [MarketStore, MarketSearchStore, MarketListingsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketToolComponent {
  protected readonly store = inject(MarketStore);
  protected readonly listings = inject(MarketListingsStore);

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
  protected readonly status = computed(() => {
    if (!this.store.reading()) return '';
    const back = this.store.readBackTo();
    return `Reading older sales from Universalis… ${
      back ? `every world back to ${longDay.format(dayStart(back))} so far; ` : ''
    }the chart fills in as they come.`;
  });

  protected price(day: WorldDay | WorldListing) {
    return `${gil.format('median' in day ? day.median : day.price)} gil`;
  }

  protected date(day: WorldDay) {
    return longDay.format(dayStart(day.day));
  }

  // A listing's units and when it was last seen ("20 for sale, seen 3 h ago").
  protected listed(listing: WorldListing) {
    return `${gil.format(listing.quantity)} for sale${listing.hq ? ', HQ' : ''}, seen ${ago(listing.reviewedAt)}`;
  }
}

// What the chart's cursor says about a day: its sales and price range.
function detail(day: { sales: number; min: number; max: number }) {
  return `${day.sales} sale${day.sales === 1 ? '' : 's'}, ${gil.format(day.min)}–${gil.format(day.max)}`;
}

// How long ago a time was, roughly.
function ago(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}
