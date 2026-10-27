import { pullClock, pullClockTenths } from './pull-time';

describe('pullClock', () => {
  it.each([
    [0, '0:00'],
    [5_400, '0:05'],
    [65_000, '1:05'],
    [750_999, '12:30'],
    [-200, '0:00'],
    [-10_000, '-0:10'],
  ])('gives %i ms as %s', (ms, text) => {
    expect(pullClock(ms)).toBe(text);
  });
});

describe('pullClockTenths', () => {
  it.each([
    [0, '0:00.0'],
    [5_430, '0:05.4'],
    [750_999, '12:30.9'],
    [-1_321, '-0:01.3'],
    [-50, '0:00.0'],
  ])('gives %i ms as %s', (ms, text) => {
    expect(pullClockTenths(ms)).toBe(text);
  });
});
