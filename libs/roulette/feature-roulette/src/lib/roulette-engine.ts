import { Duty, DutyGroup, DutyRoulette } from './duties.models';

// The rules of the three-wheel roulette, kept free of Angular so they can be
// tested on their own:
//   1. a duty type, from the types the user allowed;
//   2. a duty of that type within the level limits (for the "Duty Roulettes"
//      type, one of the allowed duty roulettes; the game then picks the duty);
//   3. how to run it, from the options that duty allows.

export const ROULETTES_TYPE = 'Duty Roulettes';

export type RunMode = 'Min IL + Silence Echo' | 'Unsynced' | 'Join Party in Progress' | 'Regular';

export interface RouletteSettings {
  // Duty group names, plus ROULETTES_TYPE.
  types: string[];
  // Ids of the duty roulettes allowed under ROULETTES_TYPE.
  roulettes: number[];
  minLevel: number | null;
  maxLevel: number | null;
}

export type Candidate = { kind: 'duty'; duty: Duty } | { kind: 'roulette'; roulette: DutyRoulette };

export interface TypeOption {
  name: string;
  candidates: Candidate[];
}

// The types the first wheel starts with: the everyday PvE content.
export const DEFAULT_TYPES = [
  'Dungeons',
  'Trials — Normal',
  'Trials — Extreme',
  'Raids — Normal',
  'Raids — Savage',
  'Alliance Raids',
  ROULETTES_TYPE,
];

// Duty roulettes that pick a PvE duty, i.e. not Gold Saucer races or PvP.
export function isPveRoulette(roulette: DutyRoulette) {
  return !roulette.pvp && !roulette.goldSaucer;
}

export function defaultSettings(roulettes: DutyRoulette[]): RouletteSettings {
  return {
    types: DEFAULT_TYPES,
    roulettes: roulettes.filter(isPveRoulette).map((r) => r.id),
    minLevel: null,
    maxLevel: null,
  };
}

export function inLevelRange(level: number, settings: RouletteSettings) {
  return (
    (settings.minLevel === null || level >= settings.minLevel) &&
    (settings.maxLevel === null || level <= settings.maxLevel)
  );
}

// The first wheel's segments: every allowed type with at least one duty left
// after the level limits, in the order the backend groups them.
export function eligibleTypes(
  groups: DutyGroup[],
  roulettes: DutyRoulette[],
  settings: RouletteSettings,
): TypeOption[] {
  const options: TypeOption[] = groups
    .filter((group) => settings.types.includes(group.name))
    .map((group) => ({
      name: group.name,
      candidates: group.duties
        .filter((duty) => inLevelRange(duty.level, settings))
        .map((duty): Candidate => ({ kind: 'duty', duty })),
    }));

  if (settings.types.includes(ROULETTES_TYPE)) {
    options.push({
      name: ROULETTES_TYPE,
      candidates: roulettes
        .filter((r) => settings.roulettes.includes(r.id) && inLevelRange(r.level, settings))
        .map((roulette): Candidate => ({ kind: 'roulette', roulette })),
    });
  }

  return options.filter((option) => option.candidates.length > 0);
}

// The third wheel's segments. A duty roulette only offers Join Party in
// Progress or a regular run. The game data has no Silence Echo flag; it is
// offered together with Minimum IL, which is where the game allows it.
export function runModes(candidate: Candidate): RunMode[] {
  const modes: RunMode[] = [];

  if (candidate.kind === 'duty') {
    if (candidate.duty.minimumIL) modes.push('Min IL + Silence Echo');
    if (candidate.duty.unrestrictedParty) modes.push('Unsynced');
    if (candidate.duty.joinPartyInProgress) modes.push('Join Party in Progress');
  } else if (candidate.roulette.joinPartyInProgress) {
    modes.push('Join Party in Progress');
  }

  modes.push('Regular');
  return modes;
}

export function candidateName(candidate: Candidate) {
  return candidate.kind === 'duty' ? candidate.duty.name : candidate.roulette.name;
}

export function candidateLevel(candidate: Candidate) {
  return candidate.kind === 'duty' ? candidate.duty.level : candidate.roulette.level;
}

// A uniformly random index into a list of `length` items.
export function pickIndex(length: number, random: () => number = Math.random) {
  return Math.min(length - 1, Math.floor(random() * length));
}
