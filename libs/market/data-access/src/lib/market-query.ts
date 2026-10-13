import { MarketQuality } from '@everise/core/api-types';

// Everything the market page shows lives in its query string, so a link
// (or a bookmark, or Back) brings it along:
//   items=5111,5057     the items compared, by their game ids (up to 3)
//   scope=odin          the world or data centre, its name in lower case
//   quality=hq          only high (or normal, nq) quality sales
//   from=2024-01-01     the days shown, from and to (none: the whole
//   to=2026-10-01       history, up to today)
//   scale=log           a logarithmic price axis
// What is at its default is left out, except the place.

export const MAX_ITEMS = 3;

// Everise's home world: where the page starts.
export const HOME_SCOPE = 'odin';

export type PriceScale = 'linear' | 'log';

export interface MarketSelection {
  items: number[];
  scope: string;
  quality: MarketQuality;
  // The first and last day shown (YYYY-MM-DD); null: as far as there's data.
  from: string | null;
  to: string | null;
  scale: PriceScale;
}

const QUALITIES: MarketQuality[] = ['all', 'nq', 'hq'];

// A calendar day, written YYYY-MM-DD.
export function isDay(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

// What a query string asks for; what it leaves out or gets wrong is the
// default.
export function selectionFromQuery(query: { get(name: string): string | null }): MarketSelection {
  const ids = (query.get('items') ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  const scope = query.get('scope')?.trim().toLowerCase() ?? '';
  const quality = query.get('quality') as MarketQuality;
  const from = query.get('from');
  const to = query.get('to');
  return {
    items: [...new Set(ids)].slice(0, MAX_ITEMS),
    scope: /^[a-z]+$/.test(scope) ? scope : HOME_SCOPE,
    quality: QUALITIES.includes(quality) ? quality : 'all',
    from: isDay(from) ? from : null,
    to: isDay(to) ? to : null,
    scale: query.get('scale') === 'log' ? 'log' : 'linear',
  };
}

// The query string for a selection; null leaves a parameter out.
export function selectionToQuery(selection: MarketSelection): Record<string, string | null> {
  return {
    items: selection.items.length ? selection.items.join(',') : null,
    scope: selection.scope,
    quality: selection.quality === 'all' ? null : selection.quality,
    from: selection.from,
    to: selection.to,
    scale: selection.scale === 'log' ? 'log' : null,
  };
}
