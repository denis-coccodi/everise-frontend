import { HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { EventDiscordShareResponse, EventList, EventPage, NewEventDiscordShare } from '@everise/core/api-types';
import { SKIP_NOT_FOUND_REDIRECT } from '@everise/core/error-handler';
import { ApiService } from '@everise/core/http-client';

@Service()
export class EventsService {
  private readonly api = inject(ApiService);

  // The week's events, as the backend last read them from Partake.
  events() {
    return this.api.get<EventList>('/events');
  }

  // One event, with its description. An event that isn't listed (404) is
  // the event's page to explain, not a reason to leave it.
  event(id: string) {
    return this.api.get<EventPage>(`/events/${encodeURIComponent(id)}`, undefined, notFoundIsThePages());
  }

  // Shares an event in the Everise Discord, with the member's words.
  shareToDiscord(share: NewEventDiscordShare) {
    return this.api.post<EventDiscordShareResponse, NewEventDiscordShare>(
      '/events/discord',
      share,
      notFoundIsThePages(),
    );
  }
}

function notFoundIsThePages() {
  return new HttpContext().set(SKIP_NOT_FOUND_REDIRECT, true);
}
