import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PartyFinderStore } from '@everise/party-finder/data-access';

// "Every data centre": a link to each data centre's listings, by region,
// keeping what else the member picked (all its worlds). Reads the page's
// PartyFinderStore.
@Component({
  selector: 'cdt-pf-data-centres',
  templateUrl: './pf-data-centres.component.html',
  styleUrl: './pf-data-centres.component.scss',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PfDataCentresComponent {
  protected readonly store = inject(PartyFinderStore);

  protected current(name: string) {
    return name === this.store.dataCentre() ? 'page' : null;
  }
}
