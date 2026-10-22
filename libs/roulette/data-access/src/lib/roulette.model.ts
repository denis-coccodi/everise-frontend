import '@ngrx/signals';

import type { Duty, DutyRoulette } from '@everise/core/api-types';
import type { SAME_JOB, DEALERS_CHOICE } from './roulette-engine';

export interface RouletteSettings {
  // Duty group names, plus ROULETTES_TYPE.
  types: string[];
  // For each picked type, the keys (PickOption.key) of the ticked entries.
  picks: Record<string, string[]>;
  minLevel: number | null;
  maxLevel: number | null;
}

export interface PickOption {
  key: string;
  candidate: Candidate;
}

export interface TypeOption {
  name: string;
  candidates: Candidate[];
}

export type RunMode =
  | 'Min IL + Silence Echo'
  | 'Unsynced'
  | 'Awktrail'
  | 'Join Party in Progress'
  | typeof SAME_JOB
  | typeof DEALERS_CHOICE
  | 'Regular';

export type Candidate = { kind: 'duty'; duty: Duty } | { kind: 'roulette'; roulette: DutyRoulette };

export type RouletteLoadState = 'loading' | 'ready' | 'empty' | 'error';

// A duty type's name and the id the query string knows it by.
export interface DutyTypeId {
  id: number;
  name: string;
}
