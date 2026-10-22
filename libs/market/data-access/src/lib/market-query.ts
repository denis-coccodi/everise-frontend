import { MarketQuality } from '@everise/core/api-types';
import type { MarketSelection } from './market-selection.model';

// Everything the market history page shows lives in its query string, so a
// link (or a bookmark, or Back) brings it along:
//   item=5111            the item, by its game id
//   region=europe        the region whose worlds are drawn (lower case,
//                        words joined by dashes)
//   oceania=show         Oceania's worlds too (any world can visit them)
//   worlds=odin,phoenix  the worlds whose lines are drawn (none: the home
//                        world and today's cheapest)
//   quality=hq           only high (or normal, nq) quality sales
//   from=2024-01-01      the days shown, from and to (none: the last
//   to=2026-10-01        month, up to today)
//   scale=log            a logarithmic price axis
// What is at its default is left out, except the region.

// Lines one chart draws at most.
export const MAX_WORLDS = 8;

// Everise's region: where the page starts.
export const HOME_REGION = 'europe';
const QUALITIES: MarketQuality[] = ['all', 'nq', 'hq'];

// A calendar day, written YYYY-MM-DD.
export function isDay(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

// What a query string asks for; what it leaves out or gets wrong is the
// default.
export function selectionFromQuery(query: { get(name: string): string | null }): MarketSelection {
  const item = Number(query.get('item'));
  const region = query.get('region')?.trim().toLowerCase() ?? '';
  const worlds = (query.get('worlds') ?? '')
    .toLowerCase()
    .split(',')
    .filter((world) => /^[a-z]+$/.test(world));
  const quality = query.get('quality') as MarketQuality;
  const from = query.get('from');
  const to = query.get('to');
  return {
    item: Number.isInteger(item) && item > 0 ? item : null,
    region: /^[a-z]+(-[a-z]+)*$/.test(region) ? region : HOME_REGION,
    oceania: query.get('oceania') === 'show',
    worlds: [...new Set(worlds)].slice(0, MAX_WORLDS),
    quality: QUALITIES.includes(quality) ? quality : 'all',
    from: isDay(from) ? from : null,
    to: isDay(to) ? to : null,
    scale: query.get('scale') === 'log' ? 'log' : 'linear',
  };
}

// The query string for a selection; null leaves a parameter out.
export function selectionToQuery(selection: MarketSelection): Record<string, string | null> {
  return {
    item: selection.item === null ? null : String(selection.item),
    region: selection.region,
    oceania: selection.oceania ? 'show' : null,
    worlds: selection.worlds.length ? selection.worlds.join(',') : null,
    quality: selection.quality === 'all' ? null : selection.quality,
    from: selection.from,
    to: selection.to,
    scale: selection.scale === 'log' ? 'log' : null,
  };
}
