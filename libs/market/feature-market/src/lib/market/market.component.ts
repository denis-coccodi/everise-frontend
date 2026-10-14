import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { ButtonComponent, PanelComponent } from '@everise/ui/components';
import { MarketToolComponent } from '../market-tool/market-tool.component';

// Market History: an item's price over time on every world of a region,
// and where it sells cheapest now. Anyone can find the page and read what
// it does; using it needs a signed-in member (each look reads Universalis
// and stores days, and the API answers members only, which keeps bots
// off), so guests get the pitch and the way in.
@Component({
  selector: 'cdt-market',
  templateUrl: './market.component.html',
  styleUrl: './market.component.scss',
  imports: [ButtonComponent, MarketToolComponent, PanelComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketComponent {
  protected readonly auth = inject(AuthStore);
}
