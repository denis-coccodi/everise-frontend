import { inject, Service } from '@angular/core';
import { DataCentre, HuntsResponse, WeeklyResponse } from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';

// What the Everise Discord relays from the channels it follows: the week's
// Fashion Report and Island Sanctuary, and the hunt trains. Open to guests.
@Service()
export class RelaysService {
  private readonly api = inject(ApiService);

  // The resets, and this week's posts with the days they're for.
  weekly() {
    return this.api.get<WeeklyResponse>('/weekly');
  }

  // The hunt trains, the latest start first: of one data centre, or all.
  hunts(dataCentre?: DataCentre) {
    const query = dataCentre ? `?dataCentre=${encodeURIComponent(dataCentre)}` : '';
    return this.api.get<HuntsResponse>(`/hunts${query}`);
  }
}
