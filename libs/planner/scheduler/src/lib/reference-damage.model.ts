import type { PullTimeline } from '@everise/core/api-types';
import type { Completion } from './completion.model';

// What other groups' kills of the fight say each attack does before any
// mitigation, by its name: the median per role (tank, healer...) and to
// anyone. For an attack an invulnerability blocked every time in the pull.
export type ReferenceDamage = Record<string, { byRole: Record<string, number>; any: number }>;

// A pull with what other groups' kills add to it, once read: what they say
// of its blocked attacks, and for a wipe the kills themselves (up to three
// that could be read, none when FFLogs has none), to complete the part of
// the fight it never reached. Once completed from one, what was added.
export type ReferencedTimeline = PullTimeline & {
  references?: ReferenceDamage;
  clears?: PullTimeline[];
  completion?: Completion;
};
