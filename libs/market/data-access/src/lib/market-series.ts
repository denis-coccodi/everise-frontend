import { MarketDay, MarketHistory, MarketItem } from '@everise/core/api-types';

// An item's line on the chart: its days within the range, each at its date.
export interface PriceSeries {
  id: number;
  name: string;
  points: { at: number; value: number; day: MarketDay }[];
}

// The days shown: both ends included, as YYYY-MM-DD.
export interface DayRange {
  from: string;
  to: string;
}

// Today (UTC, as the history's days are), as YYYY-MM-DD.
export function today(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

// The day `days` before `day`.
export function daysBefore(day: string, days: number) {
  return today(Date.parse(`${day}T00:00:00Z`) - days * 86_400_000);
}

// The first day with sales among the items: the history starts there, and
// no range starts earlier. Null before anything has sold.
export function historyStart(history: MarketHistory | null): string | null {
  const firsts = (history?.items ?? []).flatMap((item) => item.days[0]?.day ?? []);
  return firsts.length ? firsts.reduce((a, b) => (a < b ? a : b)) : null;
}

// The range shown: the one picked, kept within the history (from its start
// to today); a missing end is the history's.
export function shownRange(picked: { from: string | null; to: string | null }, start: string, end: string): DayRange {
  const within = (day: string) => (day < start ? start : day > end ? end : day);
  const to = within(picked.to ?? end);
  const from = within(picked.from ?? start);
  return { from: from > to ? to : from, to };
}

// Each item's line, in the order picked: its days within `range`.
export function priceSeries(history: MarketHistory | null, items: MarketItem[], range: DayRange): PriceSeries[] {
  return (history?.items ?? []).map((item) => ({
    id: item.id,
    name: items.find((known) => known.id === item.id)?.name ?? `Item ${item.id}`,
    points: item.days
      .filter((day) => day.day >= range.from && day.day <= range.to)
      .map((day) => ({ at: Date.parse(`${day.day}T00:00:00Z`), value: day.median, day })),
  }));
}
