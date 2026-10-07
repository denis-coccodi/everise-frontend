import { Schemas } from './schemas';

// The FFXIV game data served by the backend (GET /api/duties, /api/roulettes,
// /api/jobs), which caches it from XIVAPI. Image fields are ids for
// GET /api/images/:id, or null without an image.

export type Duty = Schemas['Duty'];
export type Finder = Duty['finder'];
export type PvpType = Duty['pvpType'];

export type DutyGroupsResponse = Schemas['DutyGroupsResponse'];
export type DutyGroup = DutyGroupsResponse['groups'][number];

export type DutyRoulette = Schemas['Roulette'];
export type RoulettesResponse = Schemas['RoulettesResponse'];

export type Job = Schemas['Job'];
export type JobRole = Job['role'];
export type JobsResponse = Schemas['JobsResponse'];

// What the reels landed on, as ids, for POST /api/roulette-results.
export type RoulettePostRequest = Schemas['NewRouletteResult'];
