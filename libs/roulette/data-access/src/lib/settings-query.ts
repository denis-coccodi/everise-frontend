import { GOLD_SAUCER_TYPE, PVP_TYPE, ROULETTES_TYPE, RouletteSettings } from './roulette-engine';

// The Duty Finder settings live in the page's query string, so a link (or a
// bookmark, or Back) brings them along. Only what differs from the defaults
// is written: the default roulette is plain /roulette.
//   types=Dungeons,Trials — Normal   the duty types (comma-separated)
//   roulettes=r1,r5  pvp=r40,d123  goldSaucer=d7   the ticked entries of each
//                                    picked type (r: a roulette, d: a duty)
//   min=50  max=90                   the level range

// The query value for each picked type.
const PICK_PARAMS: Record<string, string> = {
  [ROULETTES_TYPE]: 'roulettes',
  [PVP_TYPE]: 'pvp',
  [GOLD_SAUCER_TYPE]: 'goldSaucer',
};

// Every query parameter the settings use.
export const SETTINGS_PARAMS = ['types', 'min', 'max', ...Object.values(PICK_PARAMS)];

// The query parameters for `settings`: a value where it differs from the
// defaults, null (no parameter) where it doesn't.
export function settingsToQuery(settings: RouletteSettings, defaults: RouletteSettings): Record<string, string | null> {
  const query: Record<string, string | null> = {
    types: sameSet(settings.types, defaults.types) ? null : settings.types.join(','),
    min: settings.minLevel === null ? null : String(settings.minLevel),
    max: settings.maxLevel === null ? null : String(settings.maxLevel),
  };
  for (const [type, param] of Object.entries(PICK_PARAMS)) {
    const picks = settings.picks[type] ?? [];
    query[param] = sameSet(picks, defaults.picks[type] ?? []) ? null : picks.map(shortKey).join(',');
  }
  return query;
}

// The settings a query string asks for; the defaults for what it leaves
// out or gets wrong. A picked type it turns on without naming its entries
// (a hand-written link) gets its usual ones (`usual`).
export function settingsFromQuery(
  query: { get(name: string): string | null },
  defaults: RouletteSettings,
  usual: (type: string) => string[] = () => [],
): RouletteSettings {
  const list = (value: string) => value.split(',').filter(Boolean);
  const typesParam = query.get('types');
  const types = typesParam === null ? defaults.types : list(typesParam);
  const picks = { ...defaults.picks };
  for (const [type, param] of Object.entries(PICK_PARAMS)) {
    const value = query.get(param);
    if (value !== null) picks[type] = list(value).flatMap((key) => longKey(key) ?? []);
    else if (typesParam !== null && types.includes(type)) picks[type] = usual(type);
  }
  return {
    types,
    picks,
    minLevel: level(query.get('min')),
    maxLevel: level(query.get('max')),
  };
}

// "roulette:12" ⇄ "r12", "duty:7" ⇄ "d7": shorter links.
function shortKey(key: string) {
  return key.replace(/^roulette:/, 'r').replace(/^duty:/, 'd');
}

function longKey(key: string) {
  const match = /^([rd])(\d+)$/.exec(key);
  if (!match) return undefined;
  return `${match[1] === 'r' ? 'roulette' : 'duty'}:${match[2]}`;
}

// A level from 1 to 100, or none.
function level(value: string | null) {
  if (value === null || value.trim() === '') return null;
  const number = Math.floor(Number(value));
  return Number.isNaN(number) ? null : Math.max(1, Math.min(100, number));
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((item) => b.includes(item));
}
