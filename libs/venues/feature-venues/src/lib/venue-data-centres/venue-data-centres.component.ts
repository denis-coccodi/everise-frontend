import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VenuesStore, venuesQuery } from '@everise/venues/data-access';

// A link to each data centre's venues, by region, the shown one current.
// Reads the page's VenuesStore.
@Component({
  selector: 'cdt-venue-data-centres',
  templateUrl: './venue-data-centres.component.html',
  styleUrl: './venue-data-centres.component.scss',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueDataCentresComponent {
  protected readonly store = inject(VenuesStore);
  protected readonly queryFor = venuesQuery;

  protected current(name: string) {
    return name === this.store.dataCentre() ? 'page' : null;
  }
}
