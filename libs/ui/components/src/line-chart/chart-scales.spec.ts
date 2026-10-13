import { timeFraction, timeTicks, valueAxis, valueFraction } from './chart-scales';

const day = (date: string) => Date.parse(`${date}T00:00:00Z`);

describe('the line chart scales', () => {
  it('rounds a linear axis to round steps, never below zero', () => {
    const axis = valueAxis(189, 348, 'linear');

    expect(axis.ticks.map((t) => t.value)).toEqual([150, 200, 250, 300, 350]);
    expect([axis.min, axis.max]).toEqual([150, 350]);
    expect(valueFraction(250, axis)).toBe(0.5);
    expect(valueAxis(3, 12_000, 'linear').min).toBe(0);
    expect(valueAxis(1_500_000, 2_400_000, 'linear').ticks.map((t) => t.label)).toEqual([
      '1.4M',
      '1.6M',
      '1.8M',
      '2M',
      '2.2M',
      '2.4M',
    ]);
  });

  it('gives a single value some room', () => {
    const axis = valueAxis(500, 500, 'linear');
    expect(axis.min).toBeLessThan(500);
    expect(axis.max).toBeGreaterThan(500);
  });

  it('spans whole powers of ten on a log axis', () => {
    const axis = valueAxis(40, 2_500_000, 'log');

    expect([axis.min, axis.max]).toEqual([10, 10_000_000]);
    expect(axis.ticks.map((t) => t.label)).toEqual(['10', '100', '1K', '10K', '100K', '1M', '10M']);
    expect(valueFraction(10_000, axis)).toBeCloseTo(0.5);
    expect(valueAxis(40, 900, 'log').ticks.map((t) => t.value)).toEqual([10, 20, 50, 100, 200, 500, 1000]);
  });

  it('places times between the ends', () => {
    expect(timeFraction(day('2024-01-11'), day('2024-01-01'), day('2024-01-21'))).toBe(0.5);
    expect(timeFraction(5, 5, 5)).toBe(0.5);
  });

  it('marks days, months or years, depending on the range', () => {
    expect(timeTicks(day('2026-10-01'), day('2026-10-13')).map((t) => t.label)).toEqual([
      '1 Oct',
      '3 Oct',
      '5 Oct',
      '7 Oct',
      '9 Oct',
      '11 Oct',
      '13 Oct',
    ]);
    expect(timeTicks(day('2026-03-15'), day('2026-08-20')).map((t) => t.label)).toEqual([
      'Apr 2026',
      'May',
      'Jun',
      'Jul',
      'Aug',
    ]);
    expect(timeTicks(day('2022-10-31'), day('2026-10-13')).map((t) => t.label)).toEqual([
      '2023',
      '2024',
      '2025',
      '2026',
    ]);
  });
});
