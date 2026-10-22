import { DutyGroup } from '@everise/core/api-types';
import { GOLD_SAUCER_TYPE, PVP_TYPE, ROULETTES_TYPE } from './roulette-engine';
import type { RouletteSettings, DutyTypeId } from './roulette.model';
// The Duty Finder settings live in the page's query string, and only there:
// the page shows what the query says, so a link (or a bookmark, or Back)
// brings them along, and plain /roulette is nothing ticked. Everything is
// named by id:
//   types=1,3,0                      the duty types: the backend's group
//                                    ids, and 0 for Duty Roulettes
//   roulettes=r1,r5  pvp=r40,d123  goldSaucer=d7   the ticked entries of
//                                    each picked type (r: a roulette, d: a duty)
//   min=50  max=90                   the level range

export const ROULETTES_TYPE_ID = 0;

// The query value for each picked type.
const PICK_PARAMS: Record<string, string> = {
  [ROULETTES_TYPE]: 'roulettes',
  [PVP_TYPE]: 'pvp',
  [GOLD_SAUCER_TYPE]: 'goldSaucer',
};

// Every duty type the page lists, in its order: the groups, then the duty
// roulettes.
export function dutyTypeIds(groups: DutyGroup[]): DutyTypeId[] {
  return [...groups.map(({ id, name }) => ({ id, name })), { id: ROULETTES_TYPE_ID, name: ROULETTES_TYPE }];
}

// The query parameters for `settings`; null (no parameter) for what is
// empty.
export function settingsToQuery(settings: RouletteSettings, types: DutyTypeId[]): Record<string, string | null> {
  const list = (items: string[]) => (items.length > 0 ? items.join(',') : null);
  const query: Record<string, string | null> = {
    types: list(types.filter((t) => settings.types.includes(t.name)).map((t) => String(t.id))),
    min: settings.minLevel === null ? null : String(settings.minLevel),
    max: settings.maxLevel === null ? null : String(settings.maxLevel),
  };
  for (const [type, param] of Object.entries(PICK_PARAMS)) {
    query[param] = list((settings.picks[type] ?? []).map(shortKey));
  }
  return query;
}

// The settings a query string asks for, as written; ids it doesn't know are
// left out.
export function settingsFromQuery(query: { get(name: string): string | null }, types: DutyTypeId[]): RouletteSettings {
  const list = (param: string) => (query.get(param) ?? '').split(',').filter(Boolean);
  const typeIds = list('types');
  return {
    types: types.filter((t) => typeIds.includes(String(t.id))).map((t) => t.name),
    picks: Object.fromEntries(
      Object.entries(PICK_PARAMS).map(([type, param]) => [type, list(param).flatMap((key) => longKey(key) ?? [])]),
    ),
    minLevel: level(query.get('min')),
    maxLevel: level(query.get('max')),
  };
}

// A level from 1 to 100, or none.
export function level(value: string | null) {
  if (value === null || value.trim() === '') return null;
  const number = Math.floor(Number(value));
  return Number.isNaN(number) ? null : Math.max(1, Math.min(100, number));
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
