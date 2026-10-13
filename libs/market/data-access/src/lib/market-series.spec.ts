import { MarketDay, MarketHistory, MarketItem } from '@everise/core/api-types';
import { daysBefore, historyStart, priceSeries, shownRange, today } from './market-series';

const day = (date: string, median: number): MarketDay => ({
  day: date,
  median,
  min: median,
  max: median,
  sales: 1,
  quantity: 1,
});

const history: MarketHistory = {
  scope: { id: 'odin', name: 'Odin', kind: 'world' },
  quality: 'all',
  items: [
    { id: 5111, complete: true, refreshedAt: null, days: [day('2023-03-01', 10), day('2024-01-01', 20)] },
    { id: 5057, complete: false, refreshedAt: null, days: [day('2022-11-02', 300), day('2024-06-01', 400)] },
    { id: 19953, complete: true, refreshedAt: null, days: [] },
  ],
};

const item = (id: number, name: string): MarketItem => ({ id, name, icon: 1, canBeHq: false, category: 'Stone' });

describe('the market series', () => {
  it('starts the history on the first day any item sold', () => {
    expect(historyStart(history)).toBe('2022-11-02');
    expect(historyStart(null)).toBeNull();
  });

  it('keeps the range within the history, a missing end being its own', () => {
    expect(shownRange({ from: null, to: null }, '2022-11-02', '2026-10-13')).toEqual({
      from: '2022-11-02',
      to: '2026-10-13',
    });
    expect(shownRange({ from: '2020-01-01', to: '2030-01-01' }, '2022-11-02', '2026-10-13')).toEqual({
      from: '2022-11-02',
      to: '2026-10-13',
    });
    expect(shownRange({ from: '2025-05-05', to: '2024-01-01' }, '2022-11-02', '2026-10-13')).toEqual({
      from: '2024-01-01',
      to: '2024-01-01',
    });
  });

  it("draws each item's middle prices within the range, in the order picked", () => {
    const series = priceSeries(history, [item(5057, 'Iron Ingot'), item(5111, 'Iron Ore')], {
      from: '2023-01-01',
      to: '2024-03-01',
    });

    expect(series.map((s) => s.name)).toEqual(['Iron Ore', 'Iron Ingot', 'Item 19953']);
    expect(series[0].points.map((p) => [new Date(p.at).toISOString().slice(0, 10), p.value])).toEqual([
      ['2023-03-01', 10],
      ['2024-01-01', 20],
    ]);
    expect(series[1].points).toEqual([]);
  });

  it('counts days in UTC', () => {
    expect(today(Date.parse('2026-10-13T23:30:00Z'))).toBe('2026-10-13');
    expect(daysBefore('2026-03-01', 1)).toBe('2026-02-28');
  });
});
