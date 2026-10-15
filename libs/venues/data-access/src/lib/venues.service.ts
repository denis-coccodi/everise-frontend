import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  NewVenueDiscordShare,
  VenueDataCentre,
  VenueDiscordShareResponse,
  VenueList,
  VenuePage,
} from '@everise/core/api-types';
import { SKIP_NOT_FOUND_REDIRECT } from '@everise/core/error-handler';
import { ApiService } from '@everise/core/http-client';

@Injectable({ providedIn: 'root' })
export class VenuesService {
  private readonly api = inject(ApiService);

  // A data centre's venues opening this week, as the backend last read them
  // from FFXIV Venues.
  venues(dataCentre: VenueDataCentre) {
    return this.api.get<VenueList>(`/venues?dataCentre=${encodeURIComponent(dataCentre)}`);
  }

  // One venue, with its regular openings. A venue that isn't listed (404)
  // is the venue's page to explain, not a reason to leave it.
  venue(id: string) {
    return this.api.get<VenuePage>(`/venues/${encodeURIComponent(id)}`, undefined, notFoundIsThePages());
  }

  // Shares a venue in the Everise Discord, with the member's words.
  shareToDiscord(share: NewVenueDiscordShare) {
    return this.api.post<VenueDiscordShareResponse, NewVenueDiscordShare>(
      '/venues/discord',
      share,
      notFoundIsThePages(),
    );
  }
}

function notFoundIsThePages() {
  return new HttpContext().set(SKIP_NOT_FOUND_REDIRECT, true);
}
