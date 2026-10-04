// The FFXIV duty lists served by the backend (GET /api/duties, /api/roulettes),
// which caches them from XIVAPI.

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
}

export interface DutyGroup {
  name: string;
  order: number;
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
}

export interface DutyGroupsResponse {
  fetchedAt: string | null;
  groups: DutyGroup[];
}

export interface RoulettesResponse {
  fetchedAt: string | null;
  roulettes: DutyRoulette[];
}
