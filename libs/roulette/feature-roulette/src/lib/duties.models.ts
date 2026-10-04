// The FFXIV game data served by the backend (GET /api/duties, /api/roulettes,
// /api/jobs), which caches it from XIVAPI. Image fields are ids for
// GET /api/images/:id, or null without an image.

export type Finder = 'Duty Finder' | 'Raid Finder' | '';

export type PvpType = 'Frontline' | 'Rival Wings' | 'Crystalline Conflict' | '';

export interface Duty {
  id: number;
  name: string;
  finder: Finder;
  expansion: string;
  level: number;
  levelSync: number;
  itemLevel: number;
  itemLevelSync: number;
  joinPartyInProgress: boolean;
  unrestrictedParty: boolean;
  minimumIL: boolean;
  explorerMode: boolean;
  dutyRecorder: boolean;
  highEnd: boolean;
  pvp: boolean;
  pvpType: PvpType;
  activeFrontline: boolean;
  roulettes: string[];
  // The duty's banner; missing in data cached before images were.
  image?: number | null;
}

export interface DutyGroup {
  name: string;
  order: number;
  // The duty type's icon.
  icon?: number | null;
  duties: Duty[];
}

export interface DutyRoulette {
  id: number;
  name: string;
  category: string;
  dutyType: string;
  level: number;
  joinPartyInProgress: boolean;
  pvp: boolean;
  goldSaucer: boolean;
  image?: number | null;
}

export type Role = 'Tank' | 'Healer' | 'Melee DPS' | 'Physical Ranged DPS' | 'Magical Ranged DPS';

export interface Job {
  id: number;
  name: string;
  abbreviation: string;
  role: Role;
  startingLevel: number;
  // Blue Mage and Beastmaster, which can't queue for regular duties.
  limited: boolean;
  icon: number;
}

export interface DutyGroupsResponse {
  fetchedAt: string | null;
  groups: DutyGroup[];
}

export interface RoulettesResponse {
  fetchedAt: string | null;
  // The Duty Roulettes type's icon.
  icon?: number | null;
  roulettes: DutyRoulette[];
}

export interface JobsResponse {
  fetchedAt: string | null;
  jobs: Job[];
}
