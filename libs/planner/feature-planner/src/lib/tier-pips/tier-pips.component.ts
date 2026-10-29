import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { SeverityTier } from '@everise/planner/scheduler';

const TIERS: SeverityTier[] = ['light', 'moderate', 'heavy', 'lethal', 'overkill'];

// How hard an attack hits, drawn: five bars growing in height, as many
// filled in the tier's colour as its rank (two for Moderate), so the colour
// isn't all that tells the tiers apart. Its name goes beside it, in words.
@Component({
  selector: 'cdt-planner-tier-pips',
  template: `@for (t of tiers; track t; let i = $index) {
    <span class="pip" [class.on]="i <= rank()" [style.height.%]="40 + i * 15"></span>
  }`,
  styleUrl: './tier-pips.component.scss',
  host: { '[class]': 'tier()', 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TierPipsComponent {
  readonly tier = input.required<SeverityTier>();
  protected readonly tiers = TIERS;
  protected readonly rank = computed(() => TIERS.indexOf(this.tier()));
}
