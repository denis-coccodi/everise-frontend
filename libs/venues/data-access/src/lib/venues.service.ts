import { Injectable, inject } from '@angular/core';
import { VenueDataCentre, VenueList } from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';

@Injectable({ providedIn: 'root' })
export class VenuesService {
  private readonly api = inject(ApiService);

  // A data centre's venues opening this week, as the backend last read them
  // from FFXIV Venues.
  venues(dataCentre: VenueDataCentre) {
    return this.api.get<VenueList>(`/venues?dataCentre=${encodeURIComponent(dataCentre)}`);
  }
}
