import { Injectable, inject } from '@angular/core';
import {
  ArticleResponse,
  DataCentre,
  NewPartyFinderDiscordShare,
  NewPartyFinderPost,
  PartyFinderBoard,
  PartyFinderDiscordShareResponse,
} from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';

@Injectable({ providedIn: 'root' })
export class PartyFinderService {
  private readonly api = inject(ApiService);

  // A data centre's listings, as the backend last read them from xivpf.
  board(dataCentre: DataCentre) {
    return this.api.get<PartyFinderBoard>(`/party-finder?dataCentre=${encodeURIComponent(dataCentre)}`);
  }

  // Shares a listing as a post (in the Everise Discord too, when asked).
  sharePost(post: NewPartyFinderPost) {
    return this.api.post<ArticleResponse, NewPartyFinderPost>('/party-finder/posts', post);
  }

  // Shares a listing in the Everise Discord only.
  shareToDiscord(share: NewPartyFinderDiscordShare) {
    return this.api.post<PartyFinderDiscordShareResponse, NewPartyFinderDiscordShare>('/party-finder/discord', share);
  }
}
