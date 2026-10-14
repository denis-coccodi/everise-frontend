import { MarketDay, MarketHistory, MarketRegion } from '@everise/core/api-types';
import {
  daysBefore,
  lowest,
  mergeHistory,
  priceSeries,
  readBackTo,
  regionWorlds,
  shownRange,
  today,
  worldDays,
} from './market-series';

const day = (date: string, median: number): MarketDay => ({
  day: date,
  median,
  min: median,
  max: median,
  sales: 1,
  quantity: 1,
});

const EUROPE: MarketRegion = {
  id: 'europe',
  name: 'Europe',
  dataCentres: [
    {
      name: 'Light',
      worlds: [
        { id: 66, name: 'Odin' },
        { id: 56, name: 'Phoenix' },
      ],
    },
    { name: 'Chaos', worlds: [{ id: 71, name: 'Moogle' }] },
  ],
};

const history: MarketHistory = {
  region: { id: 'europe', name: 'Europe' },
  item: 5111,
  quality: 'all',
  from: '2026-09-01',
  complete: true,
  readBackTo: null,
  refreshedAt: null,
  worlds: [
    { id: 66, days: [day('2026-09-01', 300), day('2026-09-03', 250), day('2026-10-13', 280)] },
    { id: 56, days: [day('2026-09-02', 250), day('2026-10-13', 260)] },
    // A world the regions don't list: left out.
    { id: 999, days: [day('2026-10-13', 1)] },
  ],
};

describe('the market series', () => {
  const worlds = regionWorlds([EUROPE]);

  it('lists the worlds by data centre, with their ids in links', () => {
    expect(worlds.map((w) => `${w.dataCentre}/${w.key}`)).toEqual(['Light/odin', 'Light/phoenix', 'Chaos/moogle']);
  });

  it('shows the last month by default, kept between the history start and today', () => {
    expect(shownRange({ from: null, to: null }, '2022-10-01', '2026-10-13', 30)).toEqual({
      from: '2026-09-13',
      to: '2026-10-13',
    });
    expect(shownRange({ from: '2020-01-01', to: '2030-01-01' }, '2022-10-01', '2026-10-13', 30)).toEqual({
      from: '2022-10-01',
      to: '2026-10-13',
    });
    expect(shownRange({ from: '2025-05-05', to: '2024-01-01' }, '2022-10-01', '2026-10-13', 30)).toEqual({
      from: '2024-01-01',
      to: '2024-01-01',
    });
  });

  it('finds the lowest median sale price, the earliest on a tie', () => {
    const days = worldDays([history], worlds, { from: '2026-09-01', to: '2026-10-13' });

    expect(lowest(days)).toMatchObject({ day: '2026-09-02', median: 250, world: { name: 'Phoenix' } });
    expect(lowest(days.filter((d) => d.day === '2026-10-13'))).toMatchObject({
      median: 260,
      world: { name: 'Phoenix' },
    });
    expect(lowest([])).toBeNull();
  });

  it("draws the chosen worlds' days within the range, in the order chosen", () => {
    const days = worldDays([history], worlds, { from: '2026-09-02', to: '2026-10-13' });
    const series = priceSeries(days, [worlds[1], worlds[0], worlds[2]]);

    expect(series.map((s) => [s.world.name, s.points.map((p) => p.day.day)])).toEqual([
      ['Phoenix', ['2026-09-02', '2026-10-13']],
      ['Odin', ['2026-09-03', '2026-10-13']],
      ['Moogle', []],
    ]);
  });

  it('keeps the days after `to` and takes the rest from the history read again', () => {
    const shown = { ...history, complete: false, readBackTo: '2026-09-03' };
    const next: MarketHistory = {
      ...history,
      complete: true,
      readBackTo: null,
      worlds: [
        { id: 66, days: [day('2026-08-20', 290), day('2026-09-03', 251)] },
        { id: 71, days: [day('2026-08-25', 199)] },
      ],
    };

    const merged = mergeHistory(shown, next, '2026-09-03');

    expect(merged.complete).toBe(true);
    expect(merged.worlds.map((w) => [w.id, w.days.map((d) => `${d.day}:${d.median}`)])).toEqual([
      [66, ['2026-08-20:290', '2026-09-03:251', '2026-10-13:280']],
      [56, ['2026-10-13:260']],
      [999, ['2026-10-13:1']],
      [71, ['2026-08-25:199']],
    ]);
    expect(readBackTo([shown, { ...history, readBackTo: '2026-01-01' }])).toBe('2026-09-03');
    expect(readBackTo([history])).toBeNull();
  });

  it('counts days in UTC', () => {
    expect(today(Date.parse('2026-10-13T23:30:00Z'))).toBe('2026-10-13');
    expect(daysBefore('2026-03-01', 1)).toBe('2026-02-28');
  });
});
