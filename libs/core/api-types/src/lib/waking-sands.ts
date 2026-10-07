import { Schemas } from './schemas';

// The Waking Sands room (GET /api/waking-sands/room and its live events).

// The room: the characters, who's in, the day's lines, and its limits (how
// many characters at once, how long a member's line).
export type SandsRoom = Schemas['SandsRoom'];

// Someone who can be brought into the room.
export type SandsCharacter = SandsRoom['characters'][number];

// A line in the room, as the backend lists them.
export type SandsLine = Schemas['SandsLine'];

// What the room pushes on GET /api/live: a new line, who's in the room now,
// and which character is writing (null: nobody).
export type SandsEvent =
  | { type: 'sands-line'; line: SandsLine }
  | { type: 'sands-presence'; present: string[] }
  | { type: 'sands-writing'; character: string | null };
