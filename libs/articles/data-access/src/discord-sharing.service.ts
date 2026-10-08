import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DiscordSharingResponse } from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';
import { catchError, map, of } from 'rxjs';

// Whether members can share in the Everise Discord: only where the backend
// has the channel's webhook (production). The forms show "Also share in the
// Everise Discord" and the Party Finder "Share to Discord" only then; false
// until the backend answers, or if it can't.
@Injectable({ providedIn: 'root' })
export class DiscordSharingService {
  private readonly apiService = inject(ApiService);

  readonly available = toSignal(
    this.apiService.get<DiscordSharingResponse>('/discord/sharing').pipe(
      map(({ available }) => available),
      catchError(() => of(false)),
    ),
    { initialValue: false },
  );
}
