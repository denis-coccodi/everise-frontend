import { MarketDay, MarketHistory, MarketRegion } from '@everise/core/api-types';

const DAY_MS = 86_400_000;

// A world the page can draw: its game id, its name and its id in links
// (the name in lower case), and where it is.
export interface MarketWorld {
  id: number;
  name: string;
  key: string;
  dataCentre: string;
  region: string;
}

// A world's line on the chart: its days within the range, each at its date.
export interface PriceSeries {
  world: MarketWorld;
  points: { at: number; value: number; day: MarketDay }[];
}

// A world's day with its world, for the lowest prices.
export interface WorldDay extends MarketDay {
  world: MarketWorld;
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
  return today(Date.parse(`${day}T00:00:00Z`) - days * DAY_MS);
}

// A day's start (ms).
export function dayStart(day: string) {
  return Date.parse(`${day}T00:00:00Z`);
}

// The range shown: the one picked, or the last `days` days, kept between
// the history's start and today.
export function shownRange(
  picked: { from: string | null; to: string | null },
  start: string,
  end: string,
  days: number,
): DayRange {
  const within = (day: string) => (day < start ? start : day > end ? end : day);
  const to = within(picked.to ?? end);
  const from = within(picked.from ?? daysBefore(end, days));
  return { from: from > to ? to : from, to };
}

// Every world of these regions, by data centre.
export function regionWorlds(regions: MarketRegion[]): MarketWorld[] {
  return regions.flatMap((region) =>
    region.dataCentres.flatMap((dataCentre) =>
      dataCentre.worlds.map((world) => ({
        ...world,
        key: world.name.toLowerCase(),
        dataCentre: dataCentre.name,
        region: region.name,
      })),
    ),
  );
}

// Every world's days in these histories, within the range.
export function worldDays(histories: MarketHistory[], worlds: MarketWorld[], range: DayRange): WorldDay[] {
  return histories.flatMap((history) =>
    history.worlds.flatMap((sold) => {
      const world = worlds.find((known) => known.id === sold.id);
      return world
        ? sold.days.filter((day) => day.day >= range.from && day.day <= range.to).map((day) => ({ ...day, world }))
        : [];
    }),
  );
}

// The lowest middle price among these days (the earliest, on a tie).
export function lowest(days: WorldDay[]): WorldDay | null {
  return days.reduce<WorldDay | null>(
    (best, day) =>
      !best || day.median < best.median || (day.median === best.median && day.day < best.day) ? day : best,
    null,
  );
}

// The chosen worlds' lines, in the order chosen.
export function priceSeries(days: WorldDay[], chosen: MarketWorld[]): PriceSeries[] {
  return chosen.map((world) => ({
    world,
    points: days
      .filter((day) => day.world.id === world.id)
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((day) => ({ at: dayStart(day.day), value: day.median, day })),
  }));
}
