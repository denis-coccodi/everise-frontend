import type { PullTimeline } from '@everise/core/api-types';

// What other groups' kills of the fight say each attack does before any
// mitigation, by its name: the median per role (tank, healer...) and to
// anyone. For an attack an invulnerability blocked every time in the pull.
export type ReferenceDamage = Record<string, { byRole: Record<string, number>; any: number }>;

// A pull with what other groups' kills add to it, once read.
export type ReferencedTimeline = PullTimeline & { references?: ReferenceDamage };
