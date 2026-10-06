import { Injectable, inject } from '@angular/core';
import { ApiService } from '@realworld/core/http-client';
import { map } from 'rxjs';

// Someone who can join a conversation in the Waking Sands.
export interface Character {
  id: string;
  name: string;
  title: string;
  image?: string;
}

// A line as the backend reads it: `from` is "member" or a character's id.
export interface ChatLine {
  from: string;
  text: string;
}

export interface Reply {
  character: string;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class WakingSandsService {
  private readonly api = inject(ApiService);

  // The characters, and whether the chat is open (Workers AI set up).
  characters() {
    return this.api.get<{ available: boolean; characters: Character[] }>('/waking-sands/characters');
  }

  // Every character in the conversation answers the member's latest line,
  // in turn.
  replies(characters: string[], lines: ChatLine[]) {
    return this.api
      .post<{ replies: Reply[] }, { characters: string[]; lines: ChatLine[] }>('/waking-sands/replies', {
        characters,
        lines,
      })
      .pipe(map((response) => response.replies));
  }
}
