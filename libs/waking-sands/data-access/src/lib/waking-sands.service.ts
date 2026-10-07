import { Injectable, inject } from '@angular/core';
import { SandsLine, SandsRoom } from '@realworld/core/api-types';
import { ApiService } from '@realworld/core/http-client';

@Injectable({ providedIn: 'root' })
export class WakingSandsService {
  private readonly api = inject(ApiService);

  room() {
    return this.api.get<SandsRoom>('/waking-sands/room');
  }

  // Brings a character in, or sends them out, for everyone.
  invite(id: string) {
    return this.api.post<{ present: string[] }, void>(`/waking-sands/room/characters/${encodeURIComponent(id)}`);
  }

  dismiss(id: string) {
    return this.api.delete<{ present: string[] }>(`/waking-sands/room/characters/${encodeURIComponent(id)}`);
  }

  // Says something in the room. The characters' answers arrive live; the
  // request ends when they're done.
  say(text: string) {
    return this.api.post<{ line: SandsLine }, { text: string }>('/waking-sands/room/lines', { text });
  }
}
