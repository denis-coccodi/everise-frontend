import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MarketQuality } from '@everise/core/api-types';
import { DEFAULT_DAYS, MarketStore, daysBefore } from '@everise/market/data-access';
import { ButtonComponent, CheckboxComponent, FieldComponent, InputComponent } from '@everise/ui/components';

// The quick ranges, in days back from today (0: the whole history). A
// longer range reads more of the history the first time.
const PRESETS = [
  { name: 'Week', days: 7 },
  { name: 'Month', days: DEFAULT_DAYS },
  { name: '3 months', days: 91 },
  { name: 'Year', days: 365 },
  { name: 'All', days: 0 },
];

// Where and which sales the chart shows, and the days it covers: picked
// dates (never before the history starts, nor after today) or a quick
// range. Reads the page's MarketStore.
@Component({
  selector: 'cdt-market-controls',
  templateUrl: './market-controls.component.html',
  styleUrl: './market-controls.component.scss',
  imports: [ButtonComponent, CheckboxComponent, FieldComponent, InputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketControlsComponent {
  protected readonly store = inject(MarketStore);

  protected readonly qualities: { value: MarketQuality; name: string }[] = [
    { value: 'all', name: 'All sales' },
    { value: 'nq', name: 'Normal quality' },
    { value: 'hq', name: 'High quality' },
  ];

  // Each quick range, and whether it's the one shown.
  protected readonly presets = computed(() => {
    const { from, to } = this.store.range();
    return PRESETS.map((preset) => {
      const start = preset.days ? daysBefore(this.store.end(), preset.days) : this.store.start();
      const shownFrom = start > this.store.start() ? start : this.store.start();
      return { ...preset, start, pressed: to === this.store.end() && from === shownFrom };
    });
  });

  protected setQuality(value: string) {
    this.store.setQuality(value as MarketQuality);
  }

  // A date outside the history is moved back within it, in the field too
  // (when that leaves the range as it was, nothing redraws the field).
  protected setFrom(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.store.setRange(event.target.value || null, this.store.to());
    event.target.value = this.store.range().from;
  }

  protected setTo(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.store.setRange(this.store.from(), event.target.value || null);
    event.target.value = this.store.range().to;
  }
}
