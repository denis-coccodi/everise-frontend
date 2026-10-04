import { Duty, DutyGroup, DutyRoulette, Job } from './duties.models';

// The rules of the three-reel roulette, kept free of Angular so they can be
// tested on their own:
//   1. a duty type, from the types the user allowed;
//   2. a duty of that type within the level limits. For the "picked" types
//      (Duty Roulettes, PvP, Gold Saucer) only the entries the user ticked;
//      for a duty roulette the game then picks the duty;
//   3. how to run it, from the Duty Finder settings that duty allows, or
//      with the whole party on one job. On "dealer's choice" the roulette
//      then deals the job too.

export const ROULETTES_TYPE = 'Duty Roulettes';
export const PVP_TYPE = 'PvP';
export const GOLD_SAUCER_TYPE = 'Gold Saucer';

// Types whose entries the user ticks one by one, in a panel under the reels.
export const PICKED_TYPES = [ROULETTES_TYPE, PVP_TYPE, GOLD_SAUCER_TYPE];

export const SAME_JOB = 'Everyone on the same job';
export const DEALERS_CHOICE = "Everyone on the same job: dealer's choice";

// Awktrail: an old duty unsynced at the level cap, in gear deliberately
// weakened so the fights play close to their original difficulty. The
// community's gear sets (8-player raids from the Coils to Pandaemonium) are
// in this sheet.
export const AWKTRAIL_GUIDE_URL =
  'https://docs.google.com/spreadsheets/d/1HjZB9wSokd5yZGgNwRlV4bbfCr3cXQLD5SMdArF0iS4/htmlview';
// The lowest duty level Awktrail is offered for.
const AWKTRAIL_MIN_LEVEL = 50;

export type RunMode =
  | 'Min IL + Silence Echo'
  | 'Unsynced'
  | 'Awktrail'
  | 'Join Party in Progress'
  | typeof SAME_JOB
  | typeof DEALERS_CHOICE
  | 'Regular';

export interface RouletteSettings {
  // Duty group names, plus ROULETTES_TYPE.
  types: string[];
  // For each picked type, the keys (PickOption.key) of the ticked entries.
  picks: Record<string, string[]>;
  minLevel: number | null;
  maxLevel: number | null;
}

export type Candidate = { kind: 'duty'; duty: Duty } | { kind: 'roulette'; roulette: DutyRoulette };

export interface PickOption {
  key: string;
  candidate: Candidate;
}

export interface TypeOption {
  name: string;
  candidates: Candidate[];
}

// The types the first reel starts with: the everyday PvE content.
export const DEFAULT_TYPES = [
  'Dungeons',
  'Trials — Normal',
  'Trials — Extreme',
  'Raids — Normal',
  'Raids — Savage',
  'Alliance Raids',
  ROULETTES_TYPE,
];

// What each party setting means, shown under it on the third reel.
const RUN_MODE_DETAILS: Record<RunMode, string> = {
  'Min IL + Silence Echo': 'Minimum item level, the Echo turned off',
  Unsynced: 'Unrestricted Party, no level sync',
  Awktrail: 'Unsynced at the level cap, in downscaled gear',
  'Join Party in Progress': 'Join a party already inside',
  [SAME_JOB]: 'The party agrees on one job for everyone',
  [DEALERS_CHOICE]: 'The roulette deals the job',
  Regular: 'The Duty Finder as usual',
};

export function runModeDetail(mode: RunMode) {
  return RUN_MODE_DETAILS[mode];
}

// Duty roulettes that pick a PvE duty, i.e. not Gold Saucer races or PvP.
export function isPveRoulette(roulette: DutyRoulette) {
  return !roulette.pvp && !roulette.goldSaucer;
}

// The entries of each picked type.
export function pickOptions(groups: DutyGroup[], roulettes: DutyRoulette[]): Record<string, PickOption[]> {
  const dutiesOf = (name: string) => groups.find((g) => g.name === name)?.duties ?? [];
  const fromRoulette = (roulette: DutyRoulette): PickOption => ({
    key: `roulette:${roulette.id}`,
    candidate: { kind: 'roulette', roulette },
  });
  const fromDuty = (duty: Duty): PickOption => ({ key: `duty:${duty.id}`, candidate: { kind: 'duty', duty } });

  return {
    [ROULETTES_TYPE]: roulettes.filter(isPveRoulette).map(fromRoulette),
    // Frontline maps aren't queued one by one: the daily challenge plays
    // today's map.
    [PVP_TYPE]: [
      ...roulettes.filter((r) => r.pvp).map(fromRoulette),
      ...dutiesOf(PVP_TYPE)
        .filter((d) => d.pvpType !== 'Frontline')
        .map(fromDuty),
    ],
    [GOLD_SAUCER_TYPE]: [
      ...roulettes.filter((r) => r.goldSaucer).map(fromRoulette),
      ...dutiesOf(GOLD_SAUCER_TYPE).map(fromDuty),
    ],
  };
}

// Custom matches need a pre-arranged party, so they start unticked.
function tickedByDefault(option: PickOption) {
  return !candidateName(option.candidate).includes('Custom Match');
}

export function defaultSettings(options: Record<string, PickOption[]>): RouletteSettings {
  return {
    types: DEFAULT_TYPES,
    picks: Object.fromEntries(
      PICKED_TYPES.map((type) => [type, (options[type] ?? []).filter(tickedByDefault).map((o) => o.key)]),
    ),
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

// Every type's candidates within the level limits, whether or not the type
// is allowed, in the order the backend groups them (duty roulettes last).
export function typeCandidates(
  groups: DutyGroup[],
  options: Record<string, PickOption[]>,
  settings: RouletteSettings,
): TypeOption[] {
  const names = [...groups.map((g) => g.name), ROULETTES_TYPE];

  return names.map((name) => {
    const candidates = PICKED_TYPES.includes(name)
      ? (options[name] ?? []).filter((o) => settings.picks[name]?.includes(o.key)).map((o) => o.candidate)
      : (groups.find((g) => g.name === name)?.duties ?? []).map((duty): Candidate => ({ kind: 'duty', duty }));

    return { name, candidates: candidates.filter((c) => inLevelRange(candidateLevel(c), settings)) };
  });
}

// The first reel's entries: the allowed types with at least one candidate.
export function eligibleTypes(
  groups: DutyGroup[],
  options: Record<string, PickOption[]>,
  settings: RouletteSettings,
): TypeOption[] {
  return typeCandidates(groups, options, settings).filter(
    (option) => settings.types.includes(option.name) && option.candidates.length > 0,
  );
}

// The third reel's entries for a candidate of the type `type`. Duty Finder
// settings only apply to duties queued through the Duty Finder or Raid
// Finder; a duty roulette only offers Join Party in Progress. The game data
// has no Silence Echo flag; it is offered together with Minimum IL, which is
// where the game allows it. Awktrail joins Unsynced for duties of level
// AWKTRAIL_MIN_LEVEL and up.
//
// The whole party on one job works for any duty, but not for a duty roulette
// (the game matches parties by role), nor for Gold Saucer card and board
// games, where jobs don't matter. Dealer's choice needs jobs to deal
// (`canDeal`).
export function runModes(candidate: Candidate, type = '', canDeal = true): RunMode[] {
  const modes: RunMode[] = [];

  if (candidate.kind === 'duty') {
    const { duty } = candidate;
    if (duty.finder !== '') {
      if (duty.minimumIL) modes.push('Min IL + Silence Echo');
      if (duty.unrestrictedParty) {
        modes.push('Unsynced');
        if (duty.level >= AWKTRAIL_MIN_LEVEL) modes.push('Awktrail');
      }
      if (duty.joinPartyInProgress) modes.push('Join Party in Progress');
    }
    if (type !== GOLD_SAUCER_TYPE) {
      modes.push(SAME_JOB);
      if (canDeal) modes.push(DEALERS_CHOICE);
    }
  } else if (candidate.roulette.joinPartyInProgress) {
    modes.push('Join Party in Progress');
  }

  modes.push('Regular');
  return modes;
}

// The jobs dealer's choice deals from: limited jobs (Blue Mage, Beastmaster)
// can't queue for regular duties.
export function dealableJobs(jobs: Job[]) {
  return jobs.filter((job) => !job.limited);
}

// Today's Frontline map, from the duty the backend flags as active.
export function todaysFrontline(groups: DutyGroup[]) {
  return groups.flatMap((g) => g.duties).find((d) => d.activeFrontline)?.name ?? null;
}

// What to show under a candidate's name. For a roulette the game picks the
// duty, except the Frontline daily challenge, whose map is known for today.
export function candidateDetail(candidate: Candidate, frontlineMap: string | null) {
  if (candidate.kind === 'roulette') {
    if (candidate.roulette.pvp && candidate.roulette.name.includes('Frontline') && frontlineMap) {
      return `Today: ${frontlineMap}`;
    }
    return 'Duty: ???';
  }
  const { level, itemLevel, expansion } = candidate.duty;
  return [`Lv. ${level}`, itemLevel ? `i${itemLevel}` : '', expansion].filter(Boolean).join(' · ');
}

export function candidateName(candidate: Candidate) {
  return candidate.kind === 'duty' ? candidate.duty.name : candidate.roulette.name;
}

export function candidateLevel(candidate: Candidate) {
  return candidate.kind === 'duty' ? candidate.duty.level : candidate.roulette.level;
}

// Settings saved by an older version of the page: keep the types and levels,
// carry over the ticked duty roulettes, and default the rest.
export function upgradeSettings(saved: unknown, defaults: RouletteSettings): RouletteSettings {
  if (!saved || typeof saved !== 'object') return defaults;
  const s = saved as Partial<RouletteSettings> & { roulettes?: number[] };
  const picks = { ...defaults.picks, ...(s.picks ?? {}) };
  if (!s.picks && Array.isArray(s.roulettes)) {
    const keys = s.roulettes.map((id) => `roulette:${id}`);
    picks[ROULETTES_TYPE] = defaults.picks[ROULETTES_TYPE].filter((k) => keys.includes(k));
  }
  return {
    types: Array.isArray(s.types) ? s.types : defaults.types,
    picks,
    minLevel: typeof s.minLevel === 'number' ? s.minLevel : null,
    maxLevel: typeof s.maxLevel === 'number' ? s.maxLevel : null,
  };
}

// A uniformly random index into a list of `length` items.
export function pickIndex(length: number, random: () => number = Math.random) {
  return Math.min(length - 1, Math.floor(random() * length));
}

// At most `max` items, spread evenly across the list so every part of it
// (every duty type) shows up.
export function spreadSample<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  return Array.from({ length: max }, (_, i) => items[Math.floor((i * items.length) / max)]);
}

// Every party setting, in the order the third reel lists them.
export const ALL_RUN_MODES: RunMode[] = [
  'Min IL + Silence Echo',
  'Unsynced',
  'Awktrail',
  'Join Party in Progress',
  SAME_JOB,
  DEALERS_CHOICE,
  'Regular',
];

// The party settings the allowed duties could land on: what the third reel
// shows before a spin. All of them when nothing is allowed yet.
export function possibleModes(options: TypeOption[], canDeal = true): RunMode[] {
  const all = ALL_RUN_MODES.filter((mode) => canDeal || mode !== DEALERS_CHOICE);
  if (options.length === 0) return all;
  const possible = new Set(options.flatMap((o) => o.candidates.flatMap((c) => runModes(c, o.name, canDeal))));
  return all.filter((mode) => possible.has(mode));
}
