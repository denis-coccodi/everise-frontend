import { Duty, DutyGroup, DutyRoulette } from './duties.models';

// The rules of the three-wheel roulette, kept free of Angular so they can be
// tested on their own:
//   1. a duty type, from the types the user allowed;
//   2. a duty of that type within the level limits. For the "picked" types
//      (Duty Roulettes, PvP, Gold Saucer) only the entries the user ticked;
//      for a duty roulette the game then picks the duty;
//   3. how to run it, from the Duty Finder settings that duty allows.

export const ROULETTES_TYPE = 'Duty Roulettes';
export const PVP_TYPE = 'PvP';
export const GOLD_SAUCER_TYPE = 'Gold Saucer';

// Types whose entries the user ticks one by one, in a panel under the wheels.
export const PICKED_TYPES = [ROULETTES_TYPE, PVP_TYPE, GOLD_SAUCER_TYPE];

export type RunMode = 'Min IL + Silence Echo' | 'Unsynced' | 'Join Party in Progress' | 'Regular';

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

// Wheel segments are small: short names for the long types.
const SHORT_TYPE_NAMES: Record<string, string> = {
  'Trials — Normal': 'Trials',
  'Trials — Extreme': 'Extreme',
  'Trials — Unreal': 'Unreal',
  'Raids — Normal': 'Raids',
  'Raids — Savage': 'Savage',
  'Raids — Ultimate': 'Ultimate',
  'Alliance Raids': 'Alliance',
  'Alliance Raids — Chaotic': 'Chaotic',
  'Variant & Criterion Dungeons': 'V&C',
  'Field Operations': 'Field Ops',
  [ROULETTES_TYPE]: 'Roulettes',
};

export function shortTypeName(name: string) {
  return SHORT_TYPE_NAMES[name] ?? name;
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

// The first wheel's segments: the allowed types with at least one candidate.
export function eligibleTypes(
  groups: DutyGroup[],
  options: Record<string, PickOption[]>,
  settings: RouletteSettings,
): TypeOption[] {
  return typeCandidates(groups, options, settings).filter(
    (option) => settings.types.includes(option.name) && option.candidates.length > 0,
  );
}

// The third wheel's segments. Duty Finder settings only apply to duties
// queued through the Duty Finder or Raid Finder; a duty roulette only offers
// Join Party in Progress. The game data has no Silence Echo flag; it is
// offered together with Minimum IL, which is where the game allows it.
export function runModes(candidate: Candidate): RunMode[] {
  const modes: RunMode[] = [];

  if (candidate.kind === 'duty') {
    const { duty } = candidate;
    if (duty.finder !== '') {
      if (duty.minimumIL) modes.push('Min IL + Silence Echo');
      if (duty.unrestrictedParty) modes.push('Unsynced');
      if (duty.joinPartyInProgress) modes.push('Join Party in Progress');
    }
  } else if (candidate.roulette.joinPartyInProgress) {
    modes.push('Join Party in Progress');
  }

  modes.push('Regular');
  return modes;
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

// Every party setting, in the order the third wheel lists them.
export const ALL_RUN_MODES: RunMode[] = ['Min IL + Silence Echo', 'Unsynced', 'Join Party in Progress', 'Regular'];

// The party settings the allowed duties could land on: what the third wheel
// shows before a spin. All of them when nothing is allowed yet.
export function possibleModes(options: TypeOption[]): RunMode[] {
  if (options.length === 0) return ALL_RUN_MODES;
  const possible = new Set(options.flatMap((o) => o.candidates.flatMap(runModes)));
  return ALL_RUN_MODES.filter((mode) => possible.has(mode));
}
