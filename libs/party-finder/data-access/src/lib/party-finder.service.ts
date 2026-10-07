import { Injectable, inject } from '@angular/core';
import { DataCentre, PartyFinderBoard } from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';

@Injectable({ providedIn: 'root' })
export class PartyFinderService {
  private readonly api = inject(ApiService);

  // A data centre's listings, as the backend last read them from xivpf.
  board(dataCentre: DataCentre) {
    return this.api.get<PartyFinderBoard>(`/party-finder?dataCentre=${encodeURIComponent(dataCentre)}`);
  }
}
