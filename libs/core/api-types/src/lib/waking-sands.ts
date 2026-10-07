// The Waking Sands room (GET /api/waking-sands/room and its live events).

// Someone who can be brought into the room.
export interface SandsCharacter {
  id: string;
  name: string;
  title: string;
  image?: string;
}

// A line in the room, as the backend lists them.
export interface SandsLine {
  id: string;
  at: string;
  // "member", "note", or the id of the character who said it.
  from: string;
  name: string;
  image?: string;
  memberId?: string;
  text: string;
}

// The room: the characters, who's in, the day's lines.
export interface SandsRoom {
  available: boolean;
  characters: SandsCharacter[];
  present: string[];
  lines: SandsLine[];
}

// What the room pushes on GET /api/live: a new line, who's in the room now,
// and which character is writing (null: nobody).
export type SandsEvent =
  | { type: 'sands-line'; line: SandsLine }
  | { type: 'sands-presence'; present: string[] }
  | { type: 'sands-writing'; character: string | null };

// The backend's limits (src/waking-sands), until the API sends them: at
// most this many characters in the room, and this long a member's line.
export const SANDS_LIMITS = { maxPresent: 3, maxLineLength: 1000 } as const;
